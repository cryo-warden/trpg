use crate::{fundamental, gen_struct, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

#[derive(Clone)]
pub struct OptionComponentTrait {
    pub option_component_trait: Ident,
    pub component: Ident,
    pub component_ty: Ident,
    pub table: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
    pub upsert_fn: Ident,
    pub getter_fn: Ident,
    pub insert_fn: Ident,
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
            upsert_fn: format_ident!("upsert_{}", ctp.component),
            getter_fn: ctp.component.to_owned(),
            insert_fn: format_ident!("insert_{}", ctp.component),
            update_fn: format_ident!("update_{}", ctp.component),
            delete_fn: format_ident!("delete_{}", ctp.component),
        }
    }

    pub fn new_vec(
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
    ) -> Result<Vec<Self>> {
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

impl ToTokens for OptionComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_trait,
            component,
            component_ty,
            table: _,
            with_component_struct,
            with_fn,
            upsert_fn,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_trait: Sized {
            fn #with_fn(self) -> ::core::option::Option<#with_component_struct<Self>> {
              ::core::option::Option::Some(#with_component_struct {
                #component: self.#getter_fn()?,
                value: self,
              })
            }
            fn #upsert_fn(self, #component: #component_ty) -> #with_component_struct<Self> {
              let #component = if ::core::option::Option::is_some(&self.#getter_fn()) {
                self.#update_fn(#component)
              } else {
                self.#insert_fn(#component)
              };
              #with_component_struct {
                #component,
                value: self,
              }
            }
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty>;
            fn #insert_fn(&self, #component: #component_ty) -> #component_ty;
            fn #update_fn(&self, #component: #component_ty) -> #component_ty;
            fn #delete_fn(&self);
          }
        })
    }
}
