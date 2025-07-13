use crate::{gen_struct, gen_trait};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};

pub struct WithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub with_entity_handle_trait: gen_trait::WithEntityHandleTrait,
}

impl WithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        weht: &gen_trait::WithEntityHandleTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            with_entity_handle_trait: weht.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        weht: &gen_trait::WithEntityHandleTrait,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .map(|wcs| Self::new(wcs, weht))
            .collect()
    }
}

impl ToTokens for WithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait,
            entity_handle_struct,
            id_fn,
            id_ty,
            ..
        } = &self.with_entity_handle_trait;
        tokens.extend(quote! {
          impl<'a, T: #with_entity_handle_trait<'a>> #with_entity_handle_trait<'a> for #with_component_struct<T> {
              fn #id_fn(&self) -> #id_ty {
                self.to_handle().#id_fn()
              }
              fn to_handle(&self) -> &#entity_handle_struct<'a> {
                self.value.to_handle()
              }
              fn into_handle(self) -> #entity_handle_struct<'a> {
                self.value.into_handle()
              }
          }
        });
    }
}

pub struct EntityHandleStruct {
    pub with_component_struct: gen_struct::EntityHandleStruct,
    pub with_entity_id_trait: gen_trait::WithEntityHandleTrait,
}

impl EntityHandleStruct {
    pub fn new(
        wcs: &gen_struct::EntityHandleStruct,
        weit: &gen_trait::WithEntityHandleTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            with_entity_id_trait: weit.to_owned(),
        }
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            id,
            ..
        } = &self.with_component_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait: with_entity_id_trait,
            id_fn,
            id_ty,
            ..
        } = &self.with_entity_id_trait;
        tokens.extend(quote! {
          impl<'a> #with_entity_id_trait<'a> for #entity_handle_struct<'a> {
              fn #id_fn(&self) -> #id_ty { self.#id }
              fn to_handle(&self) -> &Self { self }
              fn into_handle(self) -> Self { self }
          }
        });
    }
}
