#[macro_use]
extern crate quote;
#[macro_use]
extern crate syn;
extern crate proc_macro;
extern crate proc_macro2;

use proc_macro::TokenStream;
use quote::quote;
use syn::{
    Data, DeriveInput, Expr, ExprPath, Fields, Ident, Meta, MetaNameValue, Result,
    parse::{Parse, ParseStream},
};

use crate::parse_tree::{Ecs, Tokenize};

fn extract_ident_from_type(ty: &syn::Type) -> Option<&syn::Ident> {
    if let syn::Type::Path(type_path) = ty {
        if type_path.qself.is_none() {
            let last = type_path.path.segments.last()?;
            return Some(&last.ident);
        }
    }
    None
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

struct OneNamedArg {
    value: Ident,
}

impl Parse for OneNamedArg {
    fn parse(input: ParseStream) -> Result<Self> {
        // Parse: name = "Foo"
        let meta: Meta = input.parse()?;

        if let Meta::NameValue(MetaNameValue { path, value, .. }) = &meta {
            if let Some(ident) = path.get_ident() {
                if ident == "table" {
                    if let Expr::Path(ExprPath { path, .. }) = value {
                        if let Some(value) = path.get_ident() {
                            return Ok(OneNamedArg {
                                value: value.clone(),
                            });
                        }
                    }
                }
            }
        }

        Err(syn::Error::new_spanned(
            meta,
            "Expected named argument like `name = \"...\"`",
        ))
    }
}

#[proc_macro_attribute]
pub fn entity(attr: TokenStream, item: TokenStream) -> TokenStream {
    let attr = parse_macro_input!(attr as OneNamedArg);
    let input = parse_macro_input!(item as DeriveInput);
    let struct_name = &input.ident;

    let table_name = attr.value;

    let inactive_table_name = format_ident!("inactive_{}", table_name);

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
            return syn::Error::new_spanned(
                struct_name,
                "FieldMethods can only be derived for structs",
            )
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
                let mod_name =
                    format_ident!("mod_{}_component_{}_entity", field_ident, struct_name);
                let getter = format_ident!("{}", field_ident);
                let mut_getter = format_ident!("mut_{}", getter);
                let setter = format_ident!("set_{}", field_ident);

                impl_traits.push(quote! {
                    #[allow(non_snake_case)]
                    mod #mod_name {
                        use super::*;
                        use crate::component::{#trait_name};
                        #[allow(dead_code)]
                        impl #trait_name for #struct_name {
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
                    struct_name,
                    "FieldMethods can only be derived for structs",
                )
                .to_compile_error()
                .into();
            }
        }
    }

    let output = quote! {
        #output_struct

        impl crate::entity::WithEntityId for #struct_name {
            fn entity_id(&self) -> u64 {
                self.entity_id
            }
            fn archetype(&self) -> Archetype {
                Archetype::#struct_name
            }
            fn from_entity_id(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) -> Option<Self> {
                ctx.db.#table_name().entity_id().find(entity_id)
            }
            fn inactive_from_entity_id(ctx: &spacetimedb::ReducerContext, entity_id: EntityId) -> Option<Self> {
                ctx.db.#inactive_table_name().entity_id().find(entity_id)
            }
            fn iter_table(ctx: &spacetimedb::ReducerContext) -> impl Iterator<Item = Self> {
                ctx.db.#table_name().iter()
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
        }

        #(#impl_traits)*
    };

    output.into()
}

#[allow(dead_code)]
mod parse_tree {
    use proc_macro2::TokenStream;
    use quote::{ToTokens, quote};
    use std::collections::HashMap;
    use syn::{
        Error, Ident, Result, Type,
        parse::{Parse, ParseStream},
    };

    mod kw {
        custom_keyword!(components);
        custom_keyword!(archetype);
        custom_keyword!(query);
    }

    pub trait Tokenize {
        fn tokenize(&self) -> Result<TokenStream>;
    }

    struct Component {
        pub name: Ident,
        pub ty: Type,
    }

    impl Parse for Component {
        fn parse(input: ParseStream) -> Result<Self> {
            let name: syn::Ident = input.parse()?;
            input.parse::<Token![:]>()?;
            let ty: syn::Type = input.parse()?;
            Ok(Self { name, ty })
        }
    }

    impl Tokenize for Component {
        fn tokenize(&self) -> Result<TokenStream> {
            let Component { name, ty } = self;
            Ok(quote! {
              pub #name: #ty,
            })
        }
    }

    impl ToTokens for Component {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            tokens.extend(self.tokenize());
        }
    }

    struct ComponentsBlock {
        pub components: Vec<Component>,
    }

    impl Parse for ComponentsBlock {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::components>()?;

            let content;
            syn::braced!(content in input);

            let mut components = vec![];

            while !content.is_empty() {
                let components_punct = content.parse_terminated(Component::parse, Token![,])?;
                components.extend(components_punct.into_iter());
            }

            Ok(Self { components })
        }
    }

    struct Archetype {
        pub name: Ident,
        pub component_names: Vec<Ident>,
    }

    struct ArchetypeTokenizer<'a>(&'a Archetype, &'a Ecs);

    impl<'a> Tokenize for ArchetypeTokenizer<'a> {
        fn tokenize(&self) -> Result<TokenStream> {
            let ArchetypeTokenizer(archetype, ecs) = self;
            let name = &archetype.name;
            let component_lines: Vec<TokenStream> = archetype
                .component_names
                .iter()
                .map(|n| ecs.get_component(n)?.tokenize())
                .collect::<Result<Vec<TokenStream>>>()?;
            Ok(quote! {
              pub struct #name {
                #(#component_lines)*
              }
            })
        }
    }

    impl<'a> ToTokens for ArchetypeTokenizer<'a> {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            tokens.extend(self.tokenize());
        }
    }

    impl Parse for Archetype {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::archetype>()?;

            let name: syn::Ident = input.parse()?;
            let content;
            syn::braced!(content in input);

            let component_names_punct = content.parse_terminated(Ident::parse, Token![,])?;
            let component_names = component_names_punct.into_iter().collect();

            Ok(Self {
                name,
                component_names,
            })
        }
    }

    struct Query {
        pub name: Ident,
        pub component_names: Vec<Ident>,
    }

    impl Parse for Query {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::query>()?;

            let name: syn::Ident = input.parse()?;
            let content;
            syn::braced!(content in input);

            let component_names_punct = content.parse_terminated(Ident::parse, Token![,])?;
            let component_names = component_names_punct.into_iter().collect();

            Ok(Self {
                name,
                component_names,
            })
        }
    }

    struct QueryTokenizer<'a>(&'a Query, &'a Ecs);

    impl<'a> Tokenize for QueryTokenizer<'a> {
        fn tokenize(&self) -> Result<TokenStream> {
            let QueryTokenizer(archetype, ecs) = self;
            let name = &archetype.name;
            let result_name = format_ident!("{}Result", name);
            let component_lines: Vec<TokenStream> = archetype
                .component_names
                .iter()
                .map(|n| ecs.get_component(n)?.tokenize())
                .collect::<Result<Vec<TokenStream>>>()?;
            Ok(quote! {
              pub struct #name;
              pub struct #result_name {
                #(#component_lines)*
              }
            })
        }
    }

    impl<'a> ToTokens for QueryTokenizer<'a> {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            tokens.extend(self.tokenize());
        }
    }

    pub struct Ecs {
        component_map: HashMap<Ident, Component>,
        archetypes: Vec<Archetype>,
        queries: Vec<Query>,
    }

    impl Ecs {
        fn get_component(&self, key: &Ident) -> Result<&Component> {
            self.component_map.get(key).ok_or(Error::new(
                key.span(),
                format!("Cannot find component \"{}\".", key),
            ))
        }
    }

    // WIP Output the structs for the archetypes, queries, and query results.
    // WIP Output the trait for generating each query result.
    // WIP Output the trait implementation for each query result for each matching archetype.

    impl Parse for Ecs {
        fn parse(input: ParseStream) -> Result<Self> {
            let mut components_blocks: Vec<ComponentsBlock> = vec![];
            let mut archetypes: Vec<Archetype> = vec![];
            let mut queries: Vec<Query> = vec![];
            // TODO Learn to loop through twice to define archetype and query structs with all the data they need, post validation. Failure should never occur during the tokenization step.
            while !input.is_empty() {
                let la = input.lookahead1();
                if la.peek(kw::components) {
                    components_blocks.push(input.parse()?);
                } else if la.peek(kw::archetype) {
                    archetypes.push(input.parse()?);
                } else if la.peek(kw::query) {
                    queries.push(input.parse()?);
                } else {
                    Err(la.error())?;
                }
            }
            Ok(Self {
                component_map: components_blocks
                    .into_iter()
                    .flat_map(|b| b.components.into_iter().map(|c| (c.name.to_owned(), c)))
                    .collect(),
                archetypes,
                queries,
            })
        }
    }

    impl Tokenize for Ecs {
        fn tokenize(&self) -> Result<TokenStream> {
            let a = self
                .archetypes
                .iter()
                .map(|a| ArchetypeTokenizer(a, self).tokenize())
                .collect::<Result<Vec<TokenStream>>>()?;
            let q = self
                .queries
                .iter()
                .map(|q| QueryTokenizer(q, self).tokenize())
                .collect::<Result<Vec<TokenStream>>>()?;
            Ok(quote! {
              #(#a)*
              #(#q)*
            })
        }
    }

    impl ToTokens for Ecs {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            tokens.extend(self.tokenize());
        }
    }
}

#[proc_macro]
pub fn ecs(input: TokenStream) -> TokenStream {
    let ecs: Ecs = parse_macro_input!(input);
    // TODO Eliminate unwrap by moving all fallible steps into parsing.
    TokenStream::from(ecs.tokenize().unwrap())
}
