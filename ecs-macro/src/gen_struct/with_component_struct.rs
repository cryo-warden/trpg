use crate::{fundamental, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct WithComponentStruct {
    pub attrs: fundamental::Attributes,
    pub with_component_struct: Ident,
    pub component: Ident,
    pub component_ty: Ident,
}

impl WithComponentStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ctp: &macro_input::ComponentTablePair,
        cwa: &fundamental::WithAttrs<macro_input::ComponentDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_owned(),
            with_component_struct: format_ident!("With__{}__Component", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: cwa.component_ty.to_owned(),
        }
    }

    pub fn new_vec(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cds: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> RcSlice<Self> {
        cds.iter()
            .flat_map(|d| {
                d.component_table_pairs
                    .iter()
                    .map(|ctp| Self::new(a, ctp, d))
            })
            .collect()
    }
}

impl ToTokens for WithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            with_component_struct,
            component,
            component_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          #[allow(non_camel_case_types)]
          pub struct #with_component_struct<T> {
            #component: #component_ty,
            value: T,
          }
        })
    }
}
