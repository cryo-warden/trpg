use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct ComponentDeleteTrait {
    pub component_delete_trait: Ident,
    pub component: Ident,
    pub delete_fn: Ident,
}

impl ComponentDeleteTrait {
    pub fn new(ctp: &macro_input::ComponentTablePair) -> Self {
        Self {
            component_delete_trait: format_ident!("__{}__DeleteTrait", ctp.component),
            component: ctp.component.to_owned(),
            delete_fn: format_ident!("delete_{}", ctp.component),
        }
    }

    pub fn new_vec(
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> fundamental::TokensVec<Self> {
        component_declarations
            .iter()
            .flat_map(|dwa| dwa.component_table_pairs.iter().map(|ctp| Self::new(ctp)))
            .collect()
    }
}

impl ToTokens for ComponentDeleteTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_delete_trait,
            component: _,
            delete_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #component_delete_trait<T>: Sized {
            fn #delete_fn(self) -> T;
          }
        })
    }
}
