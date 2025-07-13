use crate::{fundamental, gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::Result;

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

pub struct Impl {
    ecs_struct: EcsStruct,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            entity_struct,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            new_entity_handle_trait,
            ..
        } = entity_traits;

        let ecs_struct =
            EcsStruct::new(new_entity_handle_trait, entity_struct, entity_handle_struct);

        Ok(Self { ecs_struct })
    }
}

impl ToTokens for Impl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self { ecs_struct } = self;
        tokens.extend(quote! {
            #ecs_struct
        });
    }
}
