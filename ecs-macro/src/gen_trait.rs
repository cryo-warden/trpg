use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

use crate::{gen_struct, macro_input};

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

#[derive(Clone)]
pub struct OptionComponentTrait {
    pub option_component_trait: Ident,
    pub component: Ident,
    pub component_ty: Ident,
    pub table: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
    pub getter_fn: Ident,
    pub update_fn: Ident,
    pub delete_fn: Ident,
}

impl OptionComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        d: &macro_input::ComponentDeclaration,
        wcs: &gen_struct::WithComponentStruct,
    ) -> Self {
        Self {
            option_component_trait: format_ident!("Option__{}__Trait", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: d.component_ty.to_owned(),
            table: ctp.table.to_owned(),
            with_component_struct: wcs.with_component_struct.to_owned(),
            with_fn: format_ident!("with_{}", ctp.component),
            getter_fn: ctp.component.to_owned(),
            update_fn: format_ident!("update_{}", ctp.component),
            delete_fn: format_ident!("delete_{}", ctp.component),
        }
    }
}

impl ToTokens for OptionComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_trait,
            component,
            component_ty,
            table: _,
            with_component_struct,
            with_fn,
            getter_fn,
            update_fn,
            delete_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_trait: Sized {
            fn #with_fn(self) -> ::core::option::Option<#with_component_struct<Self>> {
              Some(#with_component_struct {
                #component: self.#getter_fn()?,
                value: self,
              })
            }
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty>;
            fn #update_fn(&self, value: #component_ty) -> #component_ty;
            fn #delete_fn(&self);
          }
        })
    }
}

#[derive(Clone)]
pub struct OptionComponentIterTrait {
    pub option_component_iter_trait: Ident,
    pub option_component_trait: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
}

impl OptionComponentIterTrait {
    pub fn new(oct: &OptionComponentTrait, wcs: &gen_struct::WithComponentStruct) -> Self {
        Self {
            option_component_iter_trait: format_ident!("Option__{}__IterTrait", oct.component),
            option_component_trait: oct.option_component_trait.to_owned(),
            with_component_struct: wcs.with_component_struct.to_owned(),
            with_fn: oct.with_fn.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentIterTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_component_trait,
            with_component_struct,
            with_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_iter_trait<T: #option_component_trait>: Sized + Iterator<Item = T> {
              fn #with_fn(self) -> impl Iterator<Item = #with_component_struct<T>> {
                  self.flat_map(|e| e.#with_fn())
              }
          }
        })
    }
}
