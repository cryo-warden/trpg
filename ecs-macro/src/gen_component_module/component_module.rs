use crate::gen_component_module::component_trait::ComponentTrait;
use crate::macro_input;
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct ComponentModule {
    pub module_name: Ident,
    pub component_trait: ComponentTrait,
}

impl ComponentModule {
    pub fn new(
        module_name: Ident,
        ctp: &macro_input::ComponentTablePair,
        cdwa: &macro_input::ComponentDeclaration,
    ) -> Self {
        let component_trait = ComponentTrait::new(ctp, cdwa);
        Self {
            module_name,
            component_trait,
        }
    }
}

impl ToTokens for ComponentModule {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let module_name = &self.module_name;
        let component_trait = &self.component_trait;
        let trait_ident = &component_trait.component_trait;
        let alias_ident = format_ident!("__{}__{}", module_name, trait_ident);

        tokens.extend(quote! {
            pub mod #module_name {
                use super::*;
                #component_trait
            }

            pub use #module_name::#trait_ident as #alias_ident;
        });
    }
}
