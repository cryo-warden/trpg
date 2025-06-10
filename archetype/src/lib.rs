#[macro_use]
extern crate quote;
#[macro_use]
extern crate syn;

extern crate proc_macro;

use proc_macro::TokenStream;
use syn::{Data, DeriveInput, Fields, Ident};

fn extract_ident_from_type(ty: &syn::Type) -> Option<&syn::Ident> {
    if let syn::Type::Path(type_path) = ty {
        if type_path.qself.is_none() {
            let last = type_path.path.segments.last()?;
            return Some(&last.ident);
        }
    }
    None
}

fn get_option_inner_type(ty: &syn::Type) -> Option<&syn::Type> {
    if let syn::Type::Path(type_path) = ty {
        let segment = type_path.path.segments.first()?;
        if segment.ident == "Option" {
            if let syn::PathArguments::AngleBracketed(args) = &segment.arguments {
                if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                    return Some(inner_ty);
                }
            }
        }
    }
    None
}

#[allow(dead_code)]
#[proc_macro_derive(EntityWrap, attributes(entity_wrap))]
pub fn entity_wrap(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let name = input.ident;

    let mut table = None;

    // Look through attributes like #[my_macro(...)]
    for attr in &input.attrs {
        if attr.path().is_ident("entity_wrap") {
            let _ = attr.parse_nested_meta(|meta| {
                if meta.path.is_ident("table") {
                    let value: syn::Ident = meta.value()?.parse()?;
                    table = Some(value);
                }
                Ok(())
            });
        }
    }
    let table_name = if let Some(table_name) = table {
        table_name
    } else {
        return syn::Error::new_spanned(name, "Must specify a table.")
            .to_compile_error()
            .into();
    };
    let inactive_table_name = format_ident!("inactive_{}", table_name);

    let fields = match input.data {
        Data::Struct(ref data_struct) => match &data_struct.fields {
            Fields::Named(fields_named) => &fields_named.named,
            _ => {
                return syn::Error::new_spanned(
                    data_struct.struct_token,
                    "FieldMethods can only be derived for structs with named fields",
                )
                .to_compile_error()
                .into();
            }
        },
        _ => {
            return syn::Error::new_spanned(name, "FieldMethods can only be derived for structs")
                .to_compile_error()
                .into();
        }
    };

    let getters = fields.iter().map(|f| {
        if let Some(field_name) = &f.ident {
            if field_name == "entity_id" {
                return quote! {};
            }

            let field_ty = &f.ty;
            let setter_name = Ident::new(&format!("set_{}", field_name), field_name.span());
            if let Some(inner_type) = get_option_inner_type(field_ty) {
                quote! {
                    fn #field_name(&self) -> Option<&#inner_type> {
                        if let Some(ref value) = self.#field_name {
                          Some(value)
                        } else {
                          None
                        }
                    }
                    fn #setter_name(mut self, #field_name: #inner_type) -> Self {
                        self.#field_name = Some(#field_name);
                        self
                    }
                }
            } else {
                quote! {
                    fn #field_name(&self) -> Option<&#field_ty> {
                        Some(&self.#field_name)
                    }
                    fn #setter_name(mut self, #field_name: #field_ty) -> Self {
                        self.#field_name = #field_name;
                        self
                    }
                }
            }
        } else {
            quote! {}
        }
    });

    let expanded = quote! {
        #[automatically_derived]
        #[allow(dead_code)]
        impl EntityWrap for #name {
          fn entity_id(&self) -> EntityId {
              self.entity_id
          }
          fn archetype(&self) -> Archetype {
              Archetype::#name
          }
          fn from_entity_id(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) -> Option<Self> {
              ctx.db.#table_name().entity_id().find(entity_id)
          }
          fn inactive_from_entity_id(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) -> Option<Self> {
              ctx.db.#inactive_table_name().entity_id().find(entity_id)
          }
          fn update(self, ctx: &spacetimedb::ReducerContext) -> Self {
              let e = ctx.db.entities().id().update(Entity {
                  id: self.entity_id(),
                  archetype: self.archetype(),
              });
              ctx.db.#table_name().entity_id().update(self)
          }
          fn insert(mut self, ctx: &spacetimedb::ReducerContext) -> Self {
              let e = ctx.db.entities().insert(Entity {
                  id: 0,
                  archetype: self.archetype(),
              });
              self.entity_id = e.id;
              ctx.db.#table_name().insert(self)
          }
          fn activate(self, ctx: &spacetimedb::ReducerContext) -> Self {
              ctx.db.inactive_entities().id().delete(self.entity_id);
              ctx.db.entities().insert(Entity {
                  id: self.entity_id,
                  archetype: self.archetype(),
              });
              ctx.db.#inactive_table_name().entity_id().delete(self.entity_id);
              ctx.db.#table_name().insert(self)
          }
          fn deactivate(self, ctx: &spacetimedb::ReducerContext) -> Self {
              ctx.db.entities().id().delete(self.entity_id);
              ctx.db.inactive_entities().insert(Entity {
                  id: self.entity_id,
                  archetype: self.archetype(),
              });
              ctx.db.#table_name().entity_id().delete(self.entity_id);
              ctx.db.#inactive_table_name().insert(self)
          }

          #(#getters)*
        }
    };

    TokenStream::from(expanded)
}

#[proc_macro_attribute]
pub fn timer_component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let ident = parse_macro_input!(attr as Ident);
    let input = parse_macro_input!(item as DeriveInput);

    let struct_name = &input.ident;
    let table_name = format_ident!("{}_timer_components", ident);
    let insert_method_name = format_ident!("insert_{}_timer_component", ident);
    let delete_method_name = format_ident!("delete_{}_timer_component", ident);

    let output = quote! {
        #input

        #[allow(dead_code)]
        impl #struct_name {
            pub fn #insert_method_name(ctx: &spacetimedb::ReducerContext, entity_id: EntityId, added_micros: i64) -> Self {
                ctx.db
                    .#table_name()
                    .insert(TimerComponent {
                        entity_id,
                        timestamp: match ctx
                            .timestamp
                            .checked_add(spacetimedb::TimeDuration::from_micros(added_micros))
                        {
                            Some(timestamp) => timestamp,
                            None => ctx.timestamp,
                        },
                    })
            }
            pub fn #delete_method_name(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) {
                ctx.db
                    .#table_name()
                    .entity_id()
                    .delete(entity_id);
            }
        }
    };

    output.into()
}

#[proc_macro_attribute]
pub fn flag_component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let ident = parse_macro_input!(attr as Ident);
    let input = parse_macro_input!(item as DeriveInput);

    let struct_name = &input.ident;
    let table_name = format_ident!("{}_flag_components", ident);
    let insert_method_name = format_ident!("insert_{}_flag_component", ident);
    let delete_method_name = format_ident!("delete_{}_flag_component", ident);

    let output = quote! {
        #input

        #[allow(dead_code)]
        impl #struct_name {
            pub fn #insert_method_name(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) -> Self {
                ctx.db
                    .#table_name()
                    .insert(FlagComponent { entity_id })
            }

            pub fn #delete_method_name(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) {
                ctx.db
                    .#table_name()
                    .entity_id()
                    .delete(entity_id);
            }
        }
    };

    output.into()
}

#[proc_macro_attribute]
pub fn component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let ident = parse_macro_input!(attr as Ident);
    let input = parse_macro_input!(item as DeriveInput);

    let struct_name = &input.ident;
    let trait_name = format_ident!("{}Entity", &input.ident);
    let getter_method_name = format_ident!("{}", ident);
    let mut_getter_method_name = format_ident!("mut_{}", ident);
    let setter_method_name = format_ident!("set_{}", ident);

    let output = quote! {
        #input

        #[allow(dead_code)]
        pub trait #trait_name {
            fn #getter_method_name(&self) -> &#struct_name;
            fn #mut_getter_method_name(&mut self) -> &mut #struct_name;
            fn #setter_method_name(self, #ident: #struct_name) -> Self;
        }
    };

    output.into()
}

#[proc_macro_attribute]
pub fn entity(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let ident = &input.ident;

    let mut output_struct = input.clone();

    if let Data::Struct(data) = &mut output_struct.data {
        if let syn::Fields::Named(fields_named) = &mut data.fields {
            for field in &mut fields_named.named {
                field.attrs = (&field.attrs)
                    .iter()
                    .filter(|attr| !attr.path().is_ident("component"))
                    .cloned()
                    .collect();
            }
        }
    }

    let mut impl_traits = vec![];

    let fields = match input.data {
        Data::Struct(ref data_struct) => match &data_struct.fields {
            Fields::Named(fields_named) => &fields_named.named,
            _ => {
                return syn::Error::new_spanned(
                    data_struct.struct_token,
                    "FieldMethods can only be derived for structs with named fields",
                )
                .to_compile_error()
                .into();
            }
        },
        _ => {
            return syn::Error::new_spanned(ident, "FieldMethods can only be derived for structs")
                .to_compile_error()
                .into();
        }
    };

    for field in fields.iter() {
        let field_ident = field.ident.as_ref().unwrap();
        let field_ty = &field.ty;

        let has_attr = field
            .attrs
            .iter()
            .any(|attr| attr.path().is_ident("component"));
        if has_attr {
            if let Some(field_type_name) = extract_ident_from_type(field_ty) {
                let trait_name = format_ident!("{}Entity", field_type_name);
                let mod_name = format_ident!("mod_{}_component_{}_entity", field_ident, ident);
                let getter = format_ident!("{}", field_ident);
                let mut_getter = format_ident!("mut_{}", getter);
                let setter = format_ident!("set_{}", field_ident);

                impl_traits.push(quote! {
                    #[allow(non_snake_case)]
                    mod #mod_name {
                        use super::*;
                        use crate::component::{#trait_name};
                        #[allow(dead_code)]
                        impl #trait_name for #ident {
                            fn #getter(&self) -> &#field_ty {
                                &self.#field_ident
                            }
                            fn #mut_getter(&mut self) -> &mut #field_ty {
                                &mut self.#field_ident
                            }
                            fn #setter(mut self, #field_ident: #field_ty) -> Self {
                                self.#field_ident = #field_ident;
                                self
                            }
                        }
                    }
                });
            } else {
                return syn::Error::new_spanned(
                    ident,
                    "FieldMethods can only be derived for structs",
                )
                .to_compile_error()
                .into();
            }
        }
    }

    let output = quote! {
        #output_struct

        #(#impl_traits)*
    };

    output.into()
}
