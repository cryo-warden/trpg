use crate::RcSlice;
use crate::gen_component_module::component_module::ComponentModule;
use crate::gen_component_module::component_trait as gen_component_trait;
use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::{Error, Result};

pub struct ReplacementWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_module: ComponentModule,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl ReplacementWithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        cm: &ComponentModule,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_module: cm.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        component_modules: &RcSlice<ComponentModule>,
        option_component_traits: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> Result<RcSlice<Self>> {
        with_component_structs
            .iter()
            .map(|wcs| {
                let cm = component_modules
                    .iter()
                    .find(|cm| cm.module_name == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding component module.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(Self::new(wcs, cm, oct))
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
        let ComponentModule {
            module_name,
            component_trait,
        } = &self.component_module;
        let gen_component_trait::ComponentTrait {
            component_trait: component_trait_ident,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = component_trait;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            update_fn: option_update_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #module_name::#component_trait_ident for #with_component_struct<T> {
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
    pub component_module: ComponentModule,
}

impl PassthroughWithComponentStruct {
    pub fn new(wcs: &gen_struct::WithComponentStruct, cm: &ComponentModule) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_module: cm.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        component_modules: &RcSlice<ComponentModule>,
    ) -> RcSlice<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_modules
                    .iter()
                    .filter(|cm| cm.module_name != wcs.component)
                    .map(|cm| Self::new(wcs, cm))
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
        let ComponentModule {
            module_name,
            component_trait,
        } = &self.component_module;
        let gen_component_trait::ComponentTrait {
            component_trait: component_trait_ident,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = component_trait;
        tokens.extend(quote! {
          impl<T: #module_name::#component_trait_ident> #module_name::#component_trait_ident for #with_component_struct<T> {
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

#[derive(ToTokens)]
pub struct Impl {
    replacement_with_component_structs: RcSlice<ReplacementWithComponentStruct>,
    passthrough_with_component_structs: RcSlice<PassthroughWithComponentStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
        component_modules: &RcSlice<crate::gen_component_module::component_module::ComponentModule>,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            with_component_structs,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            option_component_traits,
            ..
        } = entity_traits;

        let replacement_with_component_structs = ReplacementWithComponentStruct::new_vec(
            with_component_structs,
            component_modules,
            option_component_traits,
        )?;

        let passthrough_with_component_structs =
            PassthroughWithComponentStruct::new_vec(with_component_structs, component_modules);

        Ok(Self {
            replacement_with_component_structs,
            passthrough_with_component_structs,
        })
    }
}
