use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

use crate::{gen_struct, macro_input};

#[derive(Clone)]
pub struct ComponentTrait {
    pub trait_name: Ident,
    pub component_name: Ident,
    pub component_ty_name: Ident,
    pub mut_getter_fn_name: Ident,
    pub getter_fn_name: Ident,
    pub update_fn_name: Ident,
    pub delete_fn_name: Ident,
}

impl ComponentTrait {
    pub fn new(
        ntp: &macro_input::ComponentNameTablePair,
        c: &macro_input::ComponentDeclaration,
    ) -> Self {
        Self {
            component_name: ntp.name.to_owned(),
            trait_name: format_ident!("__{}__Trait", ntp.name),
            component_ty_name: c.ty_name.to_owned(),
            mut_getter_fn_name: format_ident!("{}_mut", ntp.name),
            getter_fn_name: ntp.name.to_owned(),
            update_fn_name: format_ident!("update_{}", ntp.name),
            delete_fn_name: format_ident!("delete_{}", ntp.name),
        }
    }
}

impl ToTokens for ComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_name: _,
            trait_name,
            component_ty_name,
            mut_getter_fn_name,
            getter_fn_name,
            update_fn_name,
            delete_fn_name,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #trait_name: Sized {
            fn #mut_getter_fn_name(&mut self) -> &mut #component_ty_name;
            fn #getter_fn_name(&self) -> &#component_ty_name;
            fn #update_fn_name(self) -> Self;
            fn #delete_fn_name(self);
          }
        })
    }
}

#[derive(Clone)]
pub struct OptionComponentTrait {
    pub trait_name: Ident,
    pub component_name: Ident,
    pub component_ty_name: Ident,
    pub table_name: Ident,
    pub with_component_struct_name: Ident,
    pub with_fn_name: Ident,
    pub getter_fn_name: Ident,
    pub update_fn_name: Ident,
    pub delete_fn_name: Ident,
}

impl OptionComponentTrait {
    pub fn new(
        ntp: &macro_input::ComponentNameTablePair,
        d: &macro_input::ComponentDeclaration,
        wcs: &gen_struct::WithComponentStruct,
    ) -> Self {
        Self {
            trait_name: format_ident!("Option__{}__Trait", ntp.name),
            component_name: ntp.name.to_owned(),
            component_ty_name: d.ty_name.to_owned(),
            table_name: ntp.table_name.to_owned(),
            with_component_struct_name: wcs.struct_name.to_owned(),
            with_fn_name: format_ident!("with_{}", ntp.name),
            getter_fn_name: ntp.name.to_owned(),
            update_fn_name: format_ident!("update_{}", ntp.name),
            delete_fn_name: format_ident!("delete_{}", ntp.name),
        }
    }
}

impl ToTokens for OptionComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            trait_name,
            component_name,
            component_ty_name,
            table_name: _,
            with_component_struct_name,
            with_fn_name,
            getter_fn_name,
            update_fn_name,
            delete_fn_name,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #trait_name: Sized {
            fn #with_fn_name(self) -> ::core::option::Option<#with_component_struct_name<Self>> {
              Some(#with_component_struct_name {
                #component_name: self.#getter_fn_name()?,
                value: self,
              })
            }
            fn #getter_fn_name(&self) -> ::core::option::Option<#component_ty_name>;
            fn #update_fn_name(&self, value: #component_ty_name) -> #component_ty_name;
            fn #delete_fn_name(&self);
          }
        })
    }
}

#[derive(Clone)]
pub struct OptionComponentIterTrait {
    pub trait_name: Ident,
    pub option_trait_name: Ident,
    pub with_component_struct_name: Ident,
    pub with_fn_name: Ident,
}

impl OptionComponentIterTrait {
    pub fn new(oct: &OptionComponentTrait, wcs: &gen_struct::WithComponentStruct) -> Self {
        Self {
            trait_name: format_ident!("Option__{}__IterTrait", oct.component_name),
            option_trait_name: oct.trait_name.to_owned(),
            with_component_struct_name: wcs.struct_name.to_owned(),
            with_fn_name: oct.with_fn_name.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentIterTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            trait_name,
            option_trait_name,
            with_component_struct_name,
            with_fn_name,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #trait_name<T: #option_trait_name>: Sized + Iterator<Item = T> {
              fn #with_fn_name(self) -> impl Iterator<Item = #with_component_struct_name<T>> {
                  self.flat_map(|e| e.#with_fn_name())
              }
          }
        })
    }
}
