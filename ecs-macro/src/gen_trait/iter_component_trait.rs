use crate::{fundamental, gen_struct, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Ident, Result};

#[derive(Clone)]
pub struct IterComponentTrait {
    pub component: Ident,
    pub table: Ident,
    pub iter_component_trait: Ident,
    pub iter_fn: Ident,
    pub with_component_struct: Ident,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
}

impl IterComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        wcs: &gen_struct::WithComponentStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            component: ctp.component.to_owned(),
            table: ctp.table.to_owned(),
            iter_component_trait: format_ident!("__{}__Iter", ctp.component),
            iter_fn: format_ident!("iter_{}", ctp.component),
            with_component_struct: wcs.with_component_struct.to_owned(),
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

impl ToTokens for IterComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            iter_component_trait,
            iter_fn,
            with_component_struct,
            entity_handle_struct:
                gen_struct::EntityHandleStruct {
                    entity_handle_struct,
                    ..
                },
            ..
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #iter_component_trait<'a> {
            fn #iter_fn(&self) -> impl Iterator<Item = #with_component_struct<#entity_handle_struct<'a>>>;
          }
        })
    }
}
