use crate::{gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct WithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub instantiate_entity_blob_trait: gen_trait::InstantiateEntityBlobTrait,
}

impl WithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        iebt: &gen_trait::InstantiateEntityBlobTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            instantiate_entity_blob_trait: iebt.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        iebt: Option<&gen_trait::InstantiateEntityBlobTrait>,
    ) -> RcSlice<Self> {
        iebt.iter()
            .flat_map(|iebt| {
                with_component_structs
                    .iter()
                    .map(|wcs| Self::new(wcs, iebt))
            })
            .collect()
    }
}

impl ToTokens for WithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::InstantiateEntityBlobTrait {
            instantiate_entity_blob_trait,
            entity_blob_struct:
                gen_struct::EntityBlobStruct {
                    entity_blob_struct, ..
                },
        } = &self.instantiate_entity_blob_trait;
        tokens.extend(quote! {
          impl<T: #instantiate_entity_blob_trait> #instantiate_entity_blob_trait for #with_component_struct<T> {
              fn instantiate_blob(mut self, blob: #entity_blob_struct) -> Self {
                self.value = self.value.instantiate_blob(blob);
                self
              }
          }
        });
    }
}

pub struct EntityHandleStruct {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub instantiate_entity_blob_trait: gen_trait::InstantiateEntityBlobTrait,
    pub option_component_traits: RcSlice<gen_trait::OptionComponentTrait>,
}

impl EntityHandleStruct {
    pub fn new(
        wcs: &gen_struct::EntityHandleStruct,
        iebt: Option<&gen_trait::InstantiateEntityBlobTrait>,
        octs: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> Option<Self> {
        iebt.map(|iebt| Self {
            entity_handle_struct: wcs.to_owned(),
            instantiate_entity_blob_trait: iebt.to_owned(),
            option_component_traits: octs.to_owned(),
        })
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        let gen_trait::InstantiateEntityBlobTrait {
            instantiate_entity_blob_trait,
            entity_blob_struct,
        } = &self.instantiate_entity_blob_trait;
        let upsert_components = entity_blob_struct.component_fields.iter().flat_map(
            |gen_struct::EntityBlobComponentField(ctp, _)| {
                let gen_trait::OptionComponentTrait {
                    getter_fn,
                    insert_fn,
                    update_fn,
                    ..
                } = self
                    .option_component_traits
                    .iter()
                    .find(|oct| oct.component == ctp.component)?;
                let macro_input::ComponentTablePair { component, .. } = ctp;
                Some(quote! {
                  if let Some(c) = blob.#component
                  {
                    if ::core::option::Option::is_some(&self.#getter_fn()) {
                      self.#update_fn(c);
                    } else {
                      self.#insert_fn(c);
                    };
                  }
                })
            },
        );
        let gen_struct::EntityBlobStruct {
            entity_blob_struct, ..
        } = entity_blob_struct;
        tokens.extend(quote! {
          impl<'a> #instantiate_entity_blob_trait for #entity_handle_struct<'a> {
              fn instantiate_blob(self, blob: #entity_blob_struct) -> Self {
                  #(#upsert_components;)*
                  self
              }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    with_component_structs: RcSlice<WithComponentStruct>,
    entity_handle_struct: Option<EntityHandleStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            instantiate_entity_blob_trait,
            option_component_traits,
            ..
        } = entity_traits;
        let instantiate_entity_blob_trait = instantiate_entity_blob_trait.as_ref();

        let with_component_structs =
            WithComponentStruct::new_vec(with_component_structs, instantiate_entity_blob_trait);

        let entity_handle_struct = EntityHandleStruct::new(
            entity_handle_struct,
            instantiate_entity_blob_trait,
            option_component_traits,
        );

        Ok(Self {
            with_component_structs,
            entity_handle_struct,
        })
    }
}
