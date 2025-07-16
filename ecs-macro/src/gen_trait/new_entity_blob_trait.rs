use crate::gen_struct;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct NewEntityBlobTrait {
    pub new_entity_blob_trait: Ident,
    pub entity_blob_struct: gen_struct::EntityBlobStruct,
}

impl NewEntityBlobTrait {
    pub fn new(ebs: Option<&gen_struct::EntityBlobStruct>) -> Option<Self> {
        ebs.map(|ebs| Self {
            new_entity_blob_trait: format_ident!("New{}", ebs.entity_blob_struct),
            entity_blob_struct: ebs.to_owned(),
        })
    }
}

impl ToTokens for NewEntityBlobTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            new_entity_blob_trait,
            entity_blob_struct:
                gen_struct::EntityBlobStruct {
                    entity_blob_struct, ..
                },
        } = self;
        tokens.extend(quote! {
          pub trait #new_entity_blob_trait {
              fn new_blob(&self) -> #entity_blob_struct;
          }
        })
    }
}
