use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct ComponentTrait {
    pub component_trait: Ident,
    pub component: Ident,
    pub component_ty: Ident,
    pub mut_getter_fn: Ident,
    pub getter_fn: Ident,
    pub update_fn: Ident,
}

impl ComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        c: &macro_input::ComponentDeclaration,
    ) -> Self {
        Self {
            component_trait: format_ident!("__{}__Trait", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: c.component_ty.to_owned(),
            mut_getter_fn: format_ident!("{}_mut", ctp.component),
            getter_fn: ctp.component.to_owned(),
            update_fn: format_ident!("update_{}", ctp.component),
        }
    }

    pub fn new_vec(
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> Vec<Self> {
        component_declarations
            .iter()
            .flat_map(|cdwa| {
                cdwa.component_table_pairs
                    .iter()
                    .map(move |ctp| Self::new(ctp, cdwa))
            })
            .collect()
    }
}

impl ToTokens for ComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_trait,
            component: _,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #component_trait: Sized {
            fn #mut_getter_fn(&mut self) -> &mut #component_ty;
            fn #getter_fn(&self) -> &#component_ty;
            fn #update_fn(self) -> Self;
          }
        })
    }
}
