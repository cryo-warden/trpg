use crate::gen_component_module::OptionGetComponentTrait;
use crate::gen_component_module::component_trait::ComponentTrait;
use crate::macro_input;
use proc_macro2::TokenStream;
use quote::ToTokens;
use quote::{format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct ComponentModule {
    pub module: Ident,
    pub component_trait: ComponentTrait,
    pub option_get_component_trait: OptionGetComponentTrait,
}

impl ComponentModule {
    pub fn new(
        module_name: Ident,
        ctp: &macro_input::ComponentTablePair,
        cd: &macro_input::ComponentDeclaration,
    ) -> Self {
        let component_trait = ComponentTrait::new(ctp, cd);
        let option_get_component_trait = OptionGetComponentTrait::new(ctp, cd);

        Self {
            module: module_name,
            component_trait,
            option_get_component_trait,
        }
    }
}

impl ToTokens for ComponentModule {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            module,
            component_trait,
            option_get_component_trait,
            ..
        } = &self;
        let component_trait_ident = &component_trait.component_trait;
        let option_get_component_trait_ident =
            &option_get_component_trait.option_get_component_trait;
        let component_trait_alias = format_ident!("__{}__{}__", module, component_trait_ident);
        let option_get_component_trait_alias =
            format_ident!("__{}__{}__", module, option_get_component_trait_ident);

        tokens.extend(quote! {
            pub mod #module {
                use super::*;
                #component_trait
                #option_get_component_trait
            }

            pub use #module::#component_trait_ident as #component_trait_alias;
            pub use #module::#option_get_component_trait_ident as #option_get_component_trait_alias;
        });
    }
}
