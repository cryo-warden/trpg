use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct EntityHandleStruct {
    pub attrs: fundamental::Attributes,
    pub entity_handle_struct: Ident,
    pub id: Ident,
    pub id_ty: Ident,
}

impl EntityHandleStruct {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: struct_attrs.attrs.to_owned(),
            entity_handle_struct: format_ident!("{}Handle", entity_declaration.entity),
            id: entity_declaration.id.to_owned(),
            id_ty: entity_declaration.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            entity_handle_struct,
            id,
            id_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          pub struct #entity_handle_struct<'a> {
            #id: #id_ty,
            ecs: ecs::Ecs<'a>,
          }
        })
    }
}
