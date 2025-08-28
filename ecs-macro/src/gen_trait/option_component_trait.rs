use crate::{fundamental, gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

#[derive(Clone)]
pub struct OptionComponentTrait {
    pub option_component_trait: Ident,
    pub option_get_component_trait: Ident,
    pub component_field_args: fundamental::FieldArgs,
    pub component_field_names: fundamental::FieldNames,
    pub component: Ident,
    pub component_ty: Ident,
    pub table: Ident,
    pub with_component_struct: Ident,
    pub upsert_fn: Ident,
    pub upsert_new_fn: Ident,
    pub getter_fn: Ident,
    pub insert_fn: Ident,
    pub update_fn: Ident,
    pub delete_fn: Ident,
    pub insert_new_fn: Ident,
    pub update_new_fn: Ident,
}

impl OptionComponentTrait {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        cd: &macro_input::ComponentDeclaration,
        ogct: &gen_trait::OptionGetComponentTrait,
        wcs: &gen_struct::WithComponentStruct,
    ) -> Self {
        Self {
            option_component_trait: format_ident!("Option__{}__Trait", ctp.component),
            option_get_component_trait: ogct.option_get_component_trait.to_owned(),
            getter_fn: ctp.component.to_owned(),
            component_field_args: fundamental::FieldArgs(cd.fields.to_owned()),
            component_field_names: fundamental::FieldNames(cd.fields.to_owned()),
            component: ctp.component.to_owned(),
            component_ty: cd.component_ty.to_owned(),
            table: ctp.table.to_owned(),
            with_component_struct: wcs.with_component_struct.to_owned(),
            upsert_fn: format_ident!("upsert_{}", ctp.component),
            upsert_new_fn: format_ident!("upsert_new_{}", ctp.component),
            insert_fn: format_ident!("insert_{}", ctp.component),
            update_fn: format_ident!("update_{}", ctp.component),
            delete_fn: format_ident!("delete_{}", ctp.component),
            insert_new_fn: format_ident!("insert_new_{}", ctp.component),
            update_new_fn: format_ident!("update_new_{}", ctp.component),
        }
    }

    pub fn new_vec(
        component_declarations: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        option_get_component_traits: &RcSlice<gen_trait::OptionGetComponentTrait>,
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
                    let ogct = option_get_component_traits
                        .iter()
                        .find(|ogct| ogct.component == ctp.component)
                        .ok_or(Error::new(
                            ctp.component.span(),
                            "Cannot find the corresponding option-get-component trait.",
                        ))?;
                    Ok(Self::new(ctp, cdwa, ogct, wcs))
                })
            })
            .collect()
    }
}

impl ToTokens for OptionComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_trait,
            option_get_component_trait,
            component_field_args,
            component_field_names,
            component,
            component_ty,
            table: _,
            with_component_struct,
            upsert_fn,
            upsert_new_fn,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
            insert_new_fn,
            update_new_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_trait: Sized + #option_get_component_trait {
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
            fn #upsert_new_fn(self, #component_field_args) -> #with_component_struct<Self> {
              self.#upsert_fn(#component_ty::new(#component_field_names))
            }
            fn #insert_fn(&self, #component: #component_ty) -> #component_ty;
            fn #update_fn(&self, #component: #component_ty) -> #component_ty;
            fn #delete_fn(&self);
            fn #insert_new_fn(&self, #component_field_args) -> #component_ty {
              self.#insert_fn(#component_ty::new(#component_field_names))
            }
            fn #update_new_fn(&self, #component_field_args) -> #component_ty {
              self.#update_fn(#component_ty::new(#component_field_names))
            }
          }
        })
    }
}
