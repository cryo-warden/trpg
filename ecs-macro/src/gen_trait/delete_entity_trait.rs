use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct DeleteEntityTrait {
    pub delete_entity_trait: Ident,
}

impl DeleteEntityTrait {
    pub fn new() -> Self {
        Self {
            delete_entity_trait: format_ident!("DeleteEntity"),
        }
    }
}

impl ToTokens for DeleteEntityTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            delete_entity_trait,
        } = self;
        tokens.extend(quote! {
          pub trait #delete_entity_trait {
              fn delete(&self);
          }
        })
    }
}
