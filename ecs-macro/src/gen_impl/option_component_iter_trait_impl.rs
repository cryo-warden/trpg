use crate::{gen_struct, gen_trait, macro_input};
use crate::RcSlice;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::{Ident, Result};

pub struct OptionComponentIterator {
    pub option_component_iter_trait: Ident,
    pub option_with_component_trait: Ident,
}

impl OptionComponentIterator {
    pub fn new(ocit: &gen_trait::OptionComponentIterTrait) -> Self {
        Self {
            option_component_iter_trait: ocit.option_component_iter_trait.to_owned(),
            option_with_component_trait: ocit.option_with_component_trait.to_owned(),
        }
    }

    pub fn new_vec(
        option_component_iter_traits: &RcSlice<gen_trait::OptionComponentIterTrait>,
    ) -> RcSlice<Self> {
        option_component_iter_traits
            .iter()
            .map(|ocit| Self::new(ocit))
            .collect()
    }
}

impl ToTokens for OptionComponentIterator {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_with_component_trait,
        } = self;
        tokens.extend(quote! {
          impl<T: #option_with_component_trait<Output = T>, U: Iterator<Item = T>> #option_component_iter_trait<T> for U {}
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    option_component_iterators: RcSlice<OptionComponentIterator>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
        component_modules: &RcSlice<crate::gen_component_module::component_module::ComponentModule>,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let _ = entity_structs;
        let _ = component_modules;
        let gen_trait::EntityTraits {
            option_component_iter_traits,
            ..
        } = entity_traits;

        let option_component_iterators =
            OptionComponentIterator::new_vec(option_component_iter_traits);

        Ok(Self {
            option_component_iterators,
        })
    }
}
