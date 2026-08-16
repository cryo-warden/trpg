use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Ident, Type};

/// The selector stored in blob fields wherever a component declares an
/// entity-id-typed field: either a concrete id, a reference to the nth entity
/// created in the same instantiation batch, or a registered name.
pub fn selector_ident() -> Ident {
    format_ident!("EntityIdSelector")
}

/// The context passed to blob-consuming instantiation functions: the ecs (to
/// resolve names through the registry) plus the batch-local entity ids.
pub fn scope_ident() -> Ident {
    format_ident!("InstantiationScope")
}

#[derive(Clone)]
pub struct ReferenceStructs {
    pub attrs: fundamental::Attributes,
    pub selector: Ident,
    pub scope: Ident,
    pub registry_row: Ident,
    pub registry_table: fundamental::Table,
    pub id: Ident,
    pub id_ty: Type,
}

impl ReferenceStructs {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        registry_declaration: &fundamental::WithAttrs<macro_input::RegistryDeclaration>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: struct_attrs.attrs.to_owned(),
            selector: selector_ident(),
            scope: scope_ident(),
            registry_row: registry_declaration.registry_row.to_owned(),
            registry_table: fundamental::Table(registry_declaration.table.to_owned(), false),
            id: entity_declaration.id.to_owned(),
            id_ty: entity_declaration.id_ty.to_owned(),
        }
    }
}

impl ToTokens for ReferenceStructs {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            selector,
            scope,
            registry_row,
            registry_table,
            id,
            id_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          #registry_table
          pub struct #registry_row {
            #[primary_key]
            pub name: ::std::string::String,
            pub #id: #id_ty,
          }

          #attrs
          #[derive(::spacetimedb::SpacetimeType)]
          pub enum #selector {
            Literal(#id_ty),
            Local(u32),
            Named(::std::string::String),
          }

          pub struct #scope<'a> {
            pub ecs: ecs::Ecs<'a>,
            pub locals: ::std::vec::Vec<#id_ty>,
          }
        })
    }
}
