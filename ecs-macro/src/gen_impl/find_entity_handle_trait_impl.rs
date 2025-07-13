use crate::{gen_struct, gen_trait};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};

pub struct EcsStruct {
    pub find_entity_handle_trait: gen_trait::FindEntityHandleTrait,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
}

impl EcsStruct {
    pub fn new(
        feht: &gen_trait::FindEntityHandleTrait,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            find_entity_handle_trait: feht.to_owned(),
            entity_handle_struct: ehs.to_owned(),
        }
    }
}

impl ToTokens for EcsStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::FindEntityHandleTrait {
            find_entity_handle_trait,
            entity_handle_struct,
            ..
        } = &self.find_entity_handle_trait;
        let gen_struct::EntityHandleStruct { id, id_ty, .. } = &self.entity_handle_struct;
        tokens.extend(quote! {
          impl<'a> #find_entity_handle_trait<'a> for ecs::Ecs<'a> {
              fn find(self, #id: #id_ty) -> #entity_handle_struct<'a> {
                  #entity_handle_struct {
                    #id,
                    ecs: self,
                  }
              }
          }
        });
    }
}
