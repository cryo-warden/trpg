use crate::{gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct ComponentBlobStruct {
    pub component_blob_struct: gen_struct::ComponentBlobStruct,
}

impl ComponentBlobStruct {
    pub fn new(cbs: &gen_struct::ComponentBlobStruct) -> Self {
        Self {
            component_blob_struct: cbs.to_owned(),
        }
    }

    pub fn new_vec(
        component_blob_structs: &RcSlice<gen_struct::ComponentBlobStruct>,
    ) -> RcSlice<Self> {
        component_blob_structs
            .iter()
            .map(|cbs| Self::new(cbs))
            .collect()
    }
}

impl ToTokens for ComponentBlobStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::ComponentBlobStruct {
            component_struct,
            component_blob_struct,
            id,
            id_ty,
            component_fields,
            ..
        } = &self.component_blob_struct;
        let from_fields = component_fields.iter().map(|f| {
            let ident = &f.ident;
            quote! { #ident: value.#ident }
        });
        let into_fields = component_fields.iter().map(|f| {
            let ident = &f.ident;
            quote! { #ident: self.#ident }
        });
        tokens.extend(quote! {
          impl ::core::convert::From<#component_struct> for #component_blob_struct {
            fn from(value: #component_struct) -> Self {
              Self { #(#from_fields,)* }
            }
          }
          impl #component_blob_struct {
            pub fn into_component(self, #id: #id_ty) -> #component_struct {
              #component_struct { #id, #(#into_fields,)* }
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    component_blob_structs: RcSlice<ComponentBlobStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            component_blob_structs,
            ..
        } = entity_structs;
        let _ = entity_traits;

        let component_blob_structs = ComponentBlobStruct::new_vec(component_blob_structs);

        Ok(Self {
            component_blob_structs,
        })
    }
}
