use crate::{fundamental, gen_struct, gen_trait};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};

pub struct EcsStruct {
    pub new_entity_handle_trait: gen_trait::NewEntityHandleTrait,
    pub entity_struct: gen_struct::EntityStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
}

impl EcsStruct {
    pub fn new(
        neht: &gen_trait::NewEntityHandleTrait,
        es: &gen_struct::EntityStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            new_entity_handle_trait: neht.to_owned(),
            entity_struct: es.to_owned(),
            entity_handle_struct: ehs.to_owned(),
        }
    }
}

impl ToTokens for EcsStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::NewEntityHandleTrait {
            new_entity_handle_trait,
            entity_handle_struct,
            ..
        } = &self.new_entity_handle_trait;
        let gen_struct::EntityStruct {
            entity_struct,
            tables: fundamental::Tables(tables),
            ..
        } = &self.entity_struct;
        // WIP Make entity table singular.
        let table = tables.first().unwrap();
        let gen_struct::EntityHandleStruct { id, .. } = &self.entity_handle_struct;
        tokens.extend(quote! {
          impl<'a> #new_entity_handle_trait<'a> for ecs::Ecs<'a> {
              fn new(self) -> #entity_handle_struct<'a> {
                  let entity = ::spacetimedb::Table::insert(self.db.#table(), #entity_struct { id: 0 });
                  #entity_handle_struct {
                    #id: entity.id,
                    ecs: self,
                  }
              }
          }
        });
    }
}
