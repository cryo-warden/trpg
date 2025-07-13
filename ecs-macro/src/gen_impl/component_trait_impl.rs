use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{Error, Result};

pub struct ReplacementWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_trait: gen_trait::ComponentTrait,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl ReplacementWithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        ct: &gen_trait::ComponentTrait,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_trait: ct.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_traits: &Vec<gen_trait::ComponentTrait>,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Result<Vec<Self>> {
        with_component_structs
            .iter()
            .map(|wcs| {
                let ct = component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding component trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(Self::new(wcs, ct, oct))
            })
            .collect()
    }
}

impl ToTokens for ReplacementWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentTrait {
            component_trait,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = &self.component_trait;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            update_fn: option_update_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #component_trait for #with_component_struct<T> {
            fn #mut_getter_fn(&mut self) -> &mut #component_ty {
              &mut self.#component
            }
            fn #getter_fn(&self) -> &#component_ty {
              &self.#component
            }
            fn #update_fn(mut self) -> Self {
              self.#component = self.value.#option_update_fn(self.#component);
              self
            }
          }
        });
    }
}

pub struct PassthroughWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_trait: gen_trait::ComponentTrait,
}

impl PassthroughWithComponentStruct {
    pub fn new(wcs: &gen_struct::WithComponentStruct, ct: &gen_trait::ComponentTrait) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_trait: ct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_traits: &Vec<gen_trait::ComponentTrait>,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_traits
                    .iter()
                    .filter(|ct| ct.component != wcs.component)
                    .map(|ct| Self::new(wcs, ct))
            })
            .collect()
    }
}

impl ToTokens for PassthroughWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentTrait {
            component_trait,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = &self.component_trait;
        tokens.extend(quote! {
          impl<T: #component_trait> #component_trait for #with_component_struct<T> {
            fn #mut_getter_fn(&mut self) -> &mut #component_ty {
              self.value.#mut_getter_fn()
            }
            fn #getter_fn(&self) -> &#component_ty {
              self.value.#getter_fn()
            }
            fn #update_fn(mut self) -> Self {
              self.value = self.value.#update_fn();
              self
            }
          }
        });
    }
}

pub struct Impl {
    replacement_with_component_structs: Vec<ReplacementWithComponentStruct>,
    passthrough_with_component_structs: Vec<PassthroughWithComponentStruct>,
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
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            component_traits,
            option_component_traits,
            ..
        } = entity_traits;

        let replacement_with_component_structs = ReplacementWithComponentStruct::new_vec(
            with_component_structs,
            component_traits,
            option_component_traits,
        )?;

        let passthrough_with_component_structs =
            PassthroughWithComponentStruct::new_vec(with_component_structs, component_traits);

        Ok(Self {
            replacement_with_component_structs,
            passthrough_with_component_structs,
        })
    }
}

impl ToTokens for Impl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            replacement_with_component_structs,
            passthrough_with_component_structs,
        } = self;
        tokens.extend(quote! {
            #(#replacement_with_component_structs)*
            #(#passthrough_with_component_structs)*
        });
    }
}
