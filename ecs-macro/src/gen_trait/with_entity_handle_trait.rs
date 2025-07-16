use crate::gen_struct;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct WithEntityHandleTrait {
    pub with_entity_handle_trait: Ident,
    pub entity_handle_struct: Ident,
    pub id_fn: Ident,
    pub id_ty: Ident,
}

impl WithEntityHandleTrait {
    pub fn new(ehs: &gen_struct::EntityHandleStruct) -> Self {
        Self {
            with_entity_handle_trait: format_ident!("With{}", ehs.entity_handle_struct),
            entity_handle_struct: ehs.entity_handle_struct.to_owned(),
            id_fn: ehs.id.to_owned(),
            id_ty: ehs.id_ty.to_owned(),
        }
    }
}

impl ToTokens for WithEntityHandleTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            with_entity_handle_trait,
            entity_handle_struct,
            id_fn,
            id_ty,
        } = self;
        tokens.extend(quote! {
          pub trait #with_entity_handle_trait<'a> {
              fn #id_fn(&self) -> #id_ty;
              fn to_handle(&self) -> &#entity_handle_struct<'a>;
              fn into_handle(self) -> #entity_handle_struct<'a>;
          }
        })
    }
}
