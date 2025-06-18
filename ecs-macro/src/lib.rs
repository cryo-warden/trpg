#![allow(dead_code)]

extern crate proc_macro;

use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{
    Attribute, Error, Field, Ident, Result, Token, Type, braced, parenthesized,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

mod kw {
    use syn::custom_keyword;

    custom_keyword!(entity);
    custom_keyword!(component);
    custom_keyword!(tables);
}

struct WithAttrs<T> {
    pub attrs: Vec<Attribute>,
    pub value: T,
}

trait AddAttrs: Sized {
    fn add_attrs(self, attrs: Vec<Attribute>) -> WithAttrs<Self> {
        WithAttrs { attrs, value: self }
    }
}

impl<T: ToTokens> ToTokens for WithAttrs<T> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let WithAttrs { attrs, value } = self;
        tokens.extend(quote! {
          #(#attrs)*
          #value
        });
    }
}

struct Fields(Vec<Field>);

impl Parse for Fields {
    fn parse(input: ParseStream) -> Result<Self> {
        let content;
        braced!(content in input);
        let fields = content
            .parse_terminated(Field::parse_named, Token![,])?
            .into_iter()
            .collect();
        Ok(Fields(fields))
    }
}

impl ToTokens for Fields {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Fields(fields) = self;
        tokens.extend(quote! {
          #(#fields)*
        })
    }
}

struct Tables(Vec<Ident>);

impl Parse for Tables {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::tables>()?;
        let content;
        parenthesized!(content in input);
        let tables = content
            .parse_terminated(Ident::parse, Token![,])?
            .into_iter()
            .collect();
        Ok(Tables(tables))
    }
}

impl ToTokens for Tables {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Tables(tables) = self;
        tokens.extend(quote! {
          #( #[spacetimedb::table(name = #tables)] )*
        })
    }
}

struct ComponentDeclaration {
    pub name: Ident,
    pub ty: Type,
    pub tables: Tables,
    pub fields: Fields,
}

impl AddAttrs for ComponentDeclaration {}

impl Parse for ComponentDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::component>()?;
        let name = input.parse()?;
        input.parse::<Token![:]>()?;
        let ty = input.parse()?;
        let tables = input.parse()?;
        let fields = input.parse()?;
        Ok(Self {
            name,
            ty,
            tables,
            fields,
        })
    }
}

struct EntityDeclaration {
    pub name: Ident,
    pub id_name: Ident,
    pub id_ty: Type,
    pub tables: Tables,
}

impl AddAttrs for EntityDeclaration {}

impl Parse for EntityDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::entity>()?;
        let name = input.parse()?;
        let id_name = input.parse()?;
        input.parse::<Token![:]>()?;
        let id_ty = input.parse()?;
        let tables = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(Self {
            name,
            id_name,
            id_ty,
            tables,
        })
    }
}

struct Entity {
    pub entity_declaration: WithAttrs<EntityDeclaration>,
    pub component_declarations: Vec<WithAttrs<ComponentDeclaration>>,
}

impl Parse for Entity {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut entities = vec![];
        let mut components = vec![];
        while !input.is_empty() {
            let attrs = input.call(Attribute::parse_outer)?;
            let la = input.lookahead1();
            if la.peek(kw::entity) {
                let entity = input.parse::<EntityDeclaration>()?.add_attrs(attrs);
                if entities.len() > 0 {
                    return Err(Error::new(
                        entity.value.name.span(),
                        "Only one entity declaration is allowed.",
                    ));
                }
                entities.push(entity);
            } else if la.peek(kw::component) {
                components.push(input.parse::<ComponentDeclaration>()?.add_attrs(attrs));
            } else {
                return Err(la.error());
            }
        }

        if entities.len() < 1 {
            return Err(Error::new(
                input.span(),
                "An entity declaration must be specified.",
            ));
        }

        Ok(Entity {
            entity_declaration: entities.remove(0),
            component_declarations: components,
        })
    }
}

impl ToTokens for EntityDeclaration {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityDeclaration {
            name,
            id_name: _,
            id_ty,
            tables: _,
        } = self;
        tokens.extend(quote! {
          pub struct #name {
            pub id: #id_ty,
          }
        });
    }
}

fn component_trait_name(c: &ComponentDeclaration) -> Ident {
    format_ident!("__{}__Trait", c.name)
}

fn handle_name(e: &EntityDeclaration) -> Ident {
    format_ident!("{}Handle", e.name)
}

struct ComponentTrait<'a>(&'a ComponentDeclaration);

impl<'a> ToTokens for ComponentTrait<'a> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let ComponentTrait(c) = self;
        let trait_name = component_trait_name(c);
        let ComponentDeclaration { name, ty, .. } = c;
        let update_name = format_ident!("update_{}", name);
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #trait_name {
            fn #name(&self) -> ::core::option::Option<#ty>;
            fn #update_name(&self, value: #ty) -> #ty;
          }
        })
    }
}

struct ComponentTraitImplementation<'a>(&'a EntityDeclaration, &'a ComponentDeclaration);

impl<'a> ToTokens for ComponentTraitImplementation<'a> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self(e, c) = self;
        let EntityDeclaration { id_name, .. } = e;
        let entity_handle = handle_name(e);
        let trait_name = component_trait_name(c);
        let ComponentDeclaration { name, ty, .. } = c;
        let update_name = format_ident!("update_{}", name);
        let table = c.tables.0.first().unwrap();
        tokens.extend(quote! {
          impl<'a> #trait_name for #entity_handle<'a> {
            fn #name(&self) -> ::core::option::Option<#ty> {
              self.ctx.db.#table().#id_name().find(self.#id_name)
            }
            fn #update_name(&self, value: #ty) -> #ty {
              self.ctx.db.#table().#id_name().update(value)
            }
          }
        });
    }
}

struct ComponentDefinition<'a>(
    &'a WithAttrs<ComponentDeclaration>,
    &'a WithAttrs<EntityDeclaration>,
);

impl<'a> ToTokens for ComponentDefinition<'a> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let ComponentDefinition(c, e) = self;
        let c = &c.value;
        let e = &e.value;
        let ComponentDeclaration {
            ty, tables, fields, ..
        } = c;
        let EntityDeclaration { id_name, id_ty, .. } = e;
        let component_trait = ComponentTrait(c);
        tokens.extend(quote! {
          #tables
          pub struct #ty {
            #[primary_key]
            pub #id_name: #id_ty,
            #fields
          }
          #component_trait
        });
    }
}

struct EntityHandle<'a>(&'a Entity);

impl<'a> ToTokens for EntityHandle<'a> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityHandle(entity) = *self;
        let Entity {
            entity_declaration,
            component_declarations,
        } = entity;
        let entity_declaration = &entity_declaration.value;
        let component_trait_implementations = component_declarations
            .iter()
            .map(|WithAttrs { value: c, .. }| ComponentTraitImplementation(entity_declaration, c))
            .collect::<Vec<_>>();
        let EntityDeclaration {
            name,
            id_name,
            id_ty,
            tables: _,
        } = entity_declaration;
        let entity_handle = format_ident!("{}Handle", name);
        tokens.extend(quote! {
          pub struct #entity_handle<'a> {
            pub ctx: &'a spacetimedb::ReducerContext,
            pub #id_name: #id_ty,
          }
          #(#component_trait_implementations)*
        })
    }
}

impl ToTokens for Entity {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Entity {
            entity_declaration,
            component_declarations: components,
        } = self;
        let component_definitions = components
            .iter()
            .map(|c| ComponentDefinition(c, entity_declaration));
        let entity_handle = EntityHandle(self);
        tokens.extend(quote! {
          #entity_declaration
          #(#component_definitions)*
          #entity_handle
        });
    }
}

#[proc_macro]
pub fn entity(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let entity = parse_macro_input!(input as Entity);

    proc_macro::TokenStream::from(quote! { #entity })
}
