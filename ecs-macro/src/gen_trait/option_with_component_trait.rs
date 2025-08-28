use crate::{fundamental, gen_struct, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

#[derive(Clone)]
pub struct OptionWithComponentTrait {
    pub option_with_component_trait: Ident,
    #[allow(unused)]
    pub component: Ident,
    #[allow(unused)]
    pub component_ty: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
}

impl OptionWithComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        cd: &macro_input::ComponentDeclaration,
        wcs: &gen_struct::WithComponentStruct,
    ) -> Self {
        Self {
            option_with_component_trait: format_ident!("__{}__OptionWith", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: cd.component_ty.to_owned(),
            with_component_struct: wcs.with_component_struct.to_owned(),
            with_fn: format_ident!("with_{}", ctp.component),
        }
    }

    pub fn new_vec(
        component_declarations: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
    ) -> Result<RcSlice<Self>> {
        component_declarations
            .iter()
            .flat_map(|cdwa| {
                cdwa.component_table_pairs.iter().map(|ctp| {
                    let wcs = with_component_structs
                        .iter()
                        .find(|wcs| wcs.component == ctp.component)
                        .ok_or(Error::new(
                            ctp.component.span(),
                            "Cannot find the corresponding with-component struct.",
                        ))?;
                    Ok(Self::new(ctp, cdwa, wcs))
                })
            })
            .collect()
    }
}

impl ToTokens for OptionWithComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_with_component_trait,
            with_component_struct,
            with_fn,
            ..
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_with_component_trait: Sized {
            type Output;
            fn #with_fn(self) -> ::core::option::Option<#with_component_struct<Self::Output>>;
          }
        })
    }
}
