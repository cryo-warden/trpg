use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

use crate::{fundamental, gen_struct, macro_input};

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
            .flat_map(|cd| {
                cd.value
                    .component_table_pairs
                    .iter()
                    .map(|ctp| Self::new(ctp, &cd.value))
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
    ) -> Vec<Self> {
        component_declarations
            .iter()
            .flat_map(|d| {
                d.value
                    .component_table_pairs
                    .iter()
                    .map(|ctp| Self::new(ctp))
            })
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
            .flat_map(|d| {
                d.value.component_table_pairs.iter().map(|ctp| {
                    let wcs = with_component_structs
                        .iter()
                        .find(|wcs| wcs.component == ctp.component)
                        .ok_or(Error::new(
                            ctp.component.span(),
                            "Cannot find the corresponding with-component struct.",
                        ))?;
                    Ok(Self::new(ctp, &d.value, wcs))
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

    pub fn new_vec(
        option_component_traits: &Vec<OptionComponentTrait>,
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
    ) -> Result<Vec<Self>> {
        option_component_traits
            .iter()
            .map(|oct| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| wcs.component == oct.component)
                    .ok_or(Error::new(
                        oct.component.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(Self::new(oct, wcs))
            })
            .collect()
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

pub struct EntityTraits {
    pub component_traits: Vec<ComponentTrait>,
    pub component_delete_traits: Vec<ComponentDeleteTrait>,
    pub option_component_traits: Vec<OptionComponentTrait>,
    pub option_component_iter_traits: Vec<OptionComponentIterTrait>,
}

impl EntityTraits {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
    ) -> Result<Self> {
        let macro_input::EntityMacroInput {
            component_declarations,
            ..
        } = entity_macro_input;
        let gen_struct::EntityStructs {
            with_component_structs,
            ..
        } = entity_structs;

        let component_traits = ComponentTrait::new_vec(component_declarations);
        let component_delete_traits = ComponentDeleteTrait::new_vec(component_declarations);
        let option_component_traits =
            OptionComponentTrait::new_vec(component_declarations, with_component_structs)?;
        let option_component_iter_traits =
            OptionComponentIterTrait::new_vec(&option_component_traits, with_component_structs)?;

        Ok(Self {
            component_traits,
            component_delete_traits,
            option_component_traits,
            option_component_iter_traits,
        })
    }
}

impl ToTokens for EntityTraits {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_traits,
            component_delete_traits,
            option_component_traits,
            option_component_iter_traits,
        } = self;
        tokens.extend(quote! {
          #(#component_traits)*
          #(#component_delete_traits)*
          #(#option_component_traits)*
          #(#option_component_iter_traits)*
        });
    }
}
