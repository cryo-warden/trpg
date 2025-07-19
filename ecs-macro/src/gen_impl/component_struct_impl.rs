use crate::{fundamental, gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct ComponentStruct {
    pub component_struct: gen_struct::ComponentStruct,
    pub new_field_args: fundamental::FieldArgs,
    pub new_field_names: fundamental::FieldNames,
}

impl ComponentStruct {
    pub fn new(cs: &gen_struct::ComponentStruct) -> Self {
        Self {
            component_struct: cs.to_owned(),
            new_field_args: fundamental::FieldArgs(cs.component_fields.to_owned()),
            new_field_names: fundamental::FieldNames(cs.component_fields.to_owned()),
        }
    }

    pub fn new_vec(component_structs: &RcSlice<gen_struct::ComponentStruct>) -> RcSlice<Self> {
        component_structs.iter().map(|cs| Self::new(cs)).collect()
    }
}

impl ToTokens for ComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_struct,
            new_field_args,
            new_field_names,
        } = &self;
        let gen_struct::ComponentStruct {
            component_struct,
            id,
            ..
        } = component_struct;
        tokens.extend(quote! {
          impl #component_struct {
            pub fn new(#new_field_args) -> Self {
              Self { #id: 0, #new_field_names }
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    component_structs: RcSlice<ComponentStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            component_structs, ..
        } = entity_structs;
        let _ = entity_traits;

        let component_structs = ComponentStruct::new_vec(component_structs);

        Ok(Self { component_structs })
    }
}
