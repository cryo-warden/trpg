#[macro_use]
extern crate quote;
#[macro_use]
extern crate syn;

extern crate proc_macro;

use proc_macro::TokenStream;
use syn::{Data, DeriveInput, Fields, Ident};

#[allow(dead_code)]
#[proc_macro_derive(EntityWrap, attributes(entity_wrap))]
pub fn entity_wrap(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
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
            quote! {
                fn #field_name(&self) -> Option<&#field_ty> {
                    Some(&self.#field_name)
                }
                fn #setter_name(mut self, #field_name: #field_ty) -> Self {
                    self.#field_name = #field_name;
                    self
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
          fn update(self, ctx: &ReducerContext) -> Self {
              let e = ctx.db.entities().id().update(Entity {
                  id: self.entity_id(),
                  archetype: self.archetype(),
              });
              ctx.db.#table_name().entity_id().update(self)
          }
          fn insert(mut self, ctx: &ReducerContext) -> Self {
              let e = ctx.db.entities().insert(Entity {
                  id: 0,
                  archetype: self.archetype(),
              });
              self.entity_id = e.id;
              ctx.db.#table_name().insert(self)
          }

          #(#getters)*
        }
    };

    // Hand the output tokens back to the compiler
    TokenStream::from(expanded)
}
