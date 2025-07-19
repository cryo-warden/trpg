use crate::{fundamental, gen_struct, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Ident, Result};

#[derive(Clone)]
pub struct IntoComponentHandleTrait {
    pub into_component_handle_trait: Ident,
    pub into_handle_fn: Ident,
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
}

impl IntoComponentHandleTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        wcs: &gen_struct::WithComponentStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            into_component_handle_trait: format_ident!("Into__{}__HandleTrait", ctp.component),
            into_handle_fn: format_ident!("into_{}_handle", ctp.component),
            with_component_struct: wcs.to_owned(),
            entity_handle_struct: ehs.to_owned(),
        }
    }

    pub fn new_vec(
        component_declarations: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        wcss: &RcSlice<gen_struct::WithComponentStruct>,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Result<RcSlice<Self>> {
        component_declarations
            .iter()
            .flat_map(|cdwa| {
                cdwa.component_table_pairs.iter().map(move |ctp| {
                    let wcs = wcss
                        .iter()
                        .find(|wcs| wcs.component == ctp.component)
                        .ok_or_else(|| {
                            syn::Error::new(
                                ctp.component.span(),
                                "Cannot find the corresponding with-component struct.",
                            )
                        })?;
                    Ok(Self::new(ctp, wcs, ehs))
                })
            })
            .collect()
    }
}

impl ToTokens for IntoComponentHandleTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            into_component_handle_trait,
            into_handle_fn,
            with_component_struct:
                gen_struct::WithComponentStruct {
                    with_component_struct,
                    component,
                    component_ty,
                    ..
                },
            entity_handle_struct:
                gen_struct::EntityHandleStruct {
                    entity_handle_struct,
                    ..
                },
            ..
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #into_component_handle_trait<'a> {
            fn #into_handle_fn(&self, #component: #component_ty) -> #with_component_struct<#entity_handle_struct<'a>>;
          }
        })
    }
}
