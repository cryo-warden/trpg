use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct ReferenceImpl {
    pub reference_structs: gen_struct::ReferenceStructs,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub registry_table: syn::Ident,
}

impl ToTokens for ReferenceImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::ReferenceStructs {
            selector,
            scope,
            registry_row,
            id,
            id_ty,
            ..
        } = &self.reference_structs;
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        let registry_table = &self.registry_table;
        tokens.extend(quote! {
          impl ::core::convert::From<#id_ty> for #selector {
            fn from(#id: #id_ty) -> Self {
              Self::Literal(#id)
            }
          }

          impl #selector {
            pub fn resolve(
              &self,
              scope: &#scope<'_>,
            ) -> ::core::result::Result<#id_ty, ::std::string::String> {
              match self {
                Self::Literal(#id) => ::core::result::Result::Ok(*#id),
                Self::Local(index) => scope
                  .locals
                  .get(*index as usize)
                  .copied()
                  .ok_or_else(|| ::std::format!(
                    "Local reference {} is out of range for a batch of {} entities.",
                    index,
                    scope.locals.len(),
                  )),
                Self::Named(name) => scope
                  .ecs
                  .db
                  .#registry_table()
                  .name()
                  .find(name.to_owned())
                  .map(|row| row.#id)
                  .ok_or_else(|| ::std::format!("No entity is registered as \"{}\".", name)),
              }
            }
          }

          impl<'a> #entity_handle_struct<'a> {
            pub fn register_name(
              &self,
              name: ::std::string::String,
            ) -> ::core::result::Result<(), ::std::string::String> {
              ::spacetimedb::Table::try_insert(
                self.ecs.db.#registry_table(),
                #registry_row {
                  name,
                  #id: self.#id,
                },
              )
              .map(|_| ())
              .map_err(|e| ::std::format!("{}", e))
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    reference_impl: ReferenceImpl,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_traits;
        let gen_struct::EntityStructs {
            reference_structs,
            entity_handle_struct,
            ..
        } = entity_structs;

        Ok(Self {
            reference_impl: ReferenceImpl {
                reference_structs: reference_structs.to_owned(),
                entity_handle_struct: entity_handle_struct.to_owned(),
                registry_table: entity_macro_input.registry_declaration.table.to_owned(),
            },
        })
    }
}
