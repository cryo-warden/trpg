use crate::{gen_struct, gen_trait, macro_input};
use crate::RcSlice;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct WithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub new_entity_blob_trait: gen_trait::NewEntityBlobTrait,
}

impl WithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        nebt: &gen_trait::NewEntityBlobTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            new_entity_blob_trait: nebt.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        nebt: Option<&gen_trait::NewEntityBlobTrait>,
    ) -> RcSlice<Self> {
        nebt.iter()
            .flat_map(|nebt| {
                with_component_structs
                    .iter()
                    .map(|wcs| Self::new(wcs, nebt))
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
        let gen_trait::NewEntityBlobTrait {
            new_entity_blob_trait,
            entity_blob_struct:
                gen_struct::EntityBlobStruct {
                    entity_blob_struct, ..
                },
        } = &self.new_entity_blob_trait;
        tokens.extend(quote! {
          impl<T: #new_entity_blob_trait> #new_entity_blob_trait for #with_component_struct<T> {
              fn new_blob(&self) -> #entity_blob_struct {
                self.value.new_blob()
              }
          }
        });
    }
}

pub struct EntityHandleStruct {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub new_entity_blob_trait: gen_trait::NewEntityBlobTrait,
}

impl EntityHandleStruct {
    pub fn new(
        wcs: &gen_struct::EntityHandleStruct,
        nebt: Option<&gen_trait::NewEntityBlobTrait>,
    ) -> Option<Self> {
        nebt.map(|nebt| Self {
            entity_handle_struct: wcs.to_owned(),
            new_entity_blob_trait: nebt.to_owned(),
        })
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            id,
            ..
        } = &self.entity_handle_struct;
        let gen_trait::NewEntityBlobTrait {
            new_entity_blob_trait,
            entity_blob_struct,
        } = &self.new_entity_blob_trait;
        let fields = entity_blob_struct.component_fields.iter().map(
            |gen_struct::EntityBlobComponentField(ctp, _)| {
                let macro_input::ComponentTablePair { component, .. } = ctp;
                quote! { #component: self.#component() }
            },
        );
        let gen_struct::EntityBlobStruct {
            entity_blob_struct, ..
        } = entity_blob_struct;
        tokens.extend(quote! {
          impl<'a> #new_entity_blob_trait for #entity_handle_struct<'a> {
              fn new_blob(&self) -> #entity_blob_struct {
                  #entity_blob_struct {
                    #id: self.#id,
                    #(#fields,)*
                  }
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
        component_modules: &RcSlice<crate::gen_component_module::component_module::ComponentModule>,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let _ = component_modules;

        let gen_struct::EntityStructs {
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            new_entity_blob_trait,
            ..
        } = entity_traits;
        let new_entity_blob_trait = new_entity_blob_trait.as_ref();

        let with_component_structs =
            WithComponentStruct::new_vec(with_component_structs, new_entity_blob_trait);

        let entity_handle_struct =
            EntityHandleStruct::new(entity_handle_struct, new_entity_blob_trait);

        Ok(Self {
            with_component_structs,
            entity_handle_struct,
        })
    }
}
