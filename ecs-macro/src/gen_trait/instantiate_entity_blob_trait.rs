use crate::gen_struct;
use crate::gen_struct::scope_ident;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct InstantiateEntityBlobTrait {
    pub instantiate_entity_blob_trait: Ident,
    pub entity_blob_struct: gen_struct::EntityBlobStruct,
}

impl InstantiateEntityBlobTrait {
    pub fn new(ebs: Option<&gen_struct::EntityBlobStruct>) -> Option<Self> {
        ebs.map(|ebs| Self {
            instantiate_entity_blob_trait: format_ident!("Instantiate{}", ebs.entity_blob_struct),
            entity_blob_struct: ebs.to_owned(),
        })
    }
}

impl ToTokens for InstantiateEntityBlobTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            instantiate_entity_blob_trait,
            entity_blob_struct:
                gen_struct::EntityBlobStruct {
                    entity_blob_struct, ..
                },
        } = self;
        let scope = scope_ident();
        tokens.extend(quote! {
          pub trait #instantiate_entity_blob_trait: Sized {
              fn instantiate_blob(
                self,
                blob: #entity_blob_struct,
                scope: &#scope<'_>,
              ) -> ::core::result::Result<Self, ::std::string::String>;
          }
        })
    }
}
