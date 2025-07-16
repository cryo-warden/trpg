use crate::gen_struct;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct FindEntityHandleTrait {
    pub find_entity_handle_trait: Ident,
    pub entity_handle_struct: Ident,
    pub id: Ident,
    pub id_ty: Ident,
}

impl FindEntityHandleTrait {
    pub fn new(ehs: &gen_struct::EntityHandleStruct) -> Self {
        Self {
            find_entity_handle_trait: format_ident!("Find{}", ehs.entity_handle_struct),
            entity_handle_struct: ehs.entity_handle_struct.to_owned(),
            id: ehs.id.to_owned(),
            id_ty: ehs.id_ty.to_owned(),
        }
    }
}

impl ToTokens for FindEntityHandleTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            find_entity_handle_trait,
            entity_handle_struct,
            id,
            id_ty,
        } = self;
        tokens.extend(quote! {
          pub trait #find_entity_handle_trait<'a> {
              fn find(self, #id: #id_ty) -> #entity_handle_struct<'a>;
          }
        })
    }
}
