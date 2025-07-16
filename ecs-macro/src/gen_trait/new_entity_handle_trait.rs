use crate::gen_struct;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct NewEntityHandleTrait {
    pub new_entity_handle_trait: Ident,
    pub entity_handle_struct: Ident,
}

impl NewEntityHandleTrait {
    pub fn new(ehs: &gen_struct::EntityHandleStruct) -> Self {
        Self {
            new_entity_handle_trait: format_ident!("New{}", ehs.entity_handle_struct),
            entity_handle_struct: ehs.entity_handle_struct.to_owned(),
        }
    }
}

impl ToTokens for NewEntityHandleTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            new_entity_handle_trait,
            entity_handle_struct,
        } = self;
        tokens.extend(quote! {
          pub trait #new_entity_handle_trait<'a> {
              fn new(self) -> #entity_handle_struct<'a>;
          }
        })
    }
}
