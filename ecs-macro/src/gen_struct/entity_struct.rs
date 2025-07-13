use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::Ident;

#[derive(Clone)]
pub struct EntityStruct {
    pub attrs: fundamental::Attributes,
    pub tables: fundamental::Tables,
    pub entity_struct: Ident,
    pub id_ty: Ident,
}

impl EntityStruct {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: struct_attrs.attrs.to_joined(&entity_declaration.attrs),
            tables: entity_declaration.tables.to_owned(),
            entity_struct: entity_declaration.entity.to_owned(),
            id_ty: entity_declaration.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            tables,
            entity_struct,
            id_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #entity_struct {
            #[primary_key]
            #[auto_inc]
            pub id: #id_ty,
          }
        });
    }
}
