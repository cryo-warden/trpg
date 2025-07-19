use crate::{fundamental, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct OptionGetComponentTrait {
    pub option_component_trait: Ident,
    #[allow(unused)]
    pub component: Ident,
    pub component_ty: Ident,
    pub getter_fn: Ident,
}

impl OptionGetComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        cd: &macro_input::ComponentDeclaration,
    ) -> Self {
        Self {
            option_component_trait: format_ident!("OptionGet__{}__Trait", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: cd.component_ty.to_owned(),
            getter_fn: ctp.component.to_owned(),
        }
    }

    pub fn new_vec(
        component_declarations: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> RcSlice<Self> {
        component_declarations
            .iter()
            .flat_map(|cdwa| {
                cdwa.component_table_pairs
                    .iter()
                    .map(|ctp| Self::new(ctp, cdwa))
            })
            .collect()
    }
}

impl ToTokens for OptionGetComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_trait,
            component_ty,
            getter_fn,
            ..
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_trait: Sized {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty>;
          }
        })
    }
}
