use crate::{fundamental, gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Field, Ident, Result};

pub struct ComponentTableMethods {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub table: Ident,
    pub iter_fn: Ident,
    pub into_handle_fn: Ident,
}

impl ComponentTableMethods {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        wcs: &gen_struct::WithComponentStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            entity_handle_struct: ehs.to_owned(),
            table: ctp.table.to_owned(),
            iter_fn: format_ident!("iter_{}", ctp.component),
            into_handle_fn: format_ident!("into_{}_handle", ctp.component),
        }
    }

    pub fn new_vec(
        ctps: &Vec<macro_input::ComponentTablePair>,
        wcss: &Vec<gen_struct::WithComponentStruct>,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Result<Vec<Self>> {
        ctps.iter()
            .map(|ctp| {
                let wcs = wcss
                    .iter()
                    .find(|wcs| wcs.component == ctp.component)
                    .ok_or(Error::new(
                        ctp.component.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(Self::new(ctp, wcs, ehs))
            })
            .collect()
    }
}

impl ToTokens for ComponentTableMethods {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            table,
            iter_fn,
            into_handle_fn,
            ..
        } = self;
        let gen_struct::WithComponentStruct {
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        tokens.extend(quote! {
          pub fn #into_handle_fn(self, ctx: &::spacetimedb::ReducerContext) -> #with_component_struct<#entity_handle_struct> {
            let entity_id = self.entity_id;
            #with_component_struct {
              #component: self,
              value: #entity_handle_struct { entity_id, ecs: ecs::WithEcs::ecs(ctx) },
            }
          }
          pub fn #iter_fn(ctx: &::spacetimedb::ReducerContext) -> impl Iterator<Item = #with_component_struct<#entity_handle_struct>> {
            ::spacetimedb::Table::iter(ctx.db.#table()).map(|c| c.#into_handle_fn(ctx))
          }
        });
    }
}

pub struct ComponentStruct {
    pub component_struct: gen_struct::ComponentStruct,
    pub component_table_methods: Vec<ComponentTableMethods>,
}

impl ComponentStruct {
    pub fn new(
        ctps: &Vec<macro_input::ComponentTablePair>,
        cs: &gen_struct::ComponentStruct,
        wcss: &Vec<gen_struct::WithComponentStruct>,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Result<Self> {
        Ok(Self {
            component_struct: cs.to_owned(),
            component_table_methods: ComponentTableMethods::new_vec(ctps, wcss, ehs)?,
        })
    }

    pub fn new_vec(
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_structs: &Vec<gen_struct::ComponentStruct>,
        entity_handle_struct: &gen_struct::EntityHandleStruct,
    ) -> Result<Vec<Self>> {
        component_declarations
            .iter()
            .map(|d| {
                let cs = component_structs
                    .iter()
                    .find(|cs| cs.component_struct == d.component_ty)
                    .ok_or(Error::new(
                        d.component_ty.span(),
                        "Cannot find the corresponding component struct.",
                    ))?;
                Self::new(
                    &d.component_table_pairs,
                    cs,
                    with_component_structs,
                    entity_handle_struct,
                )
            })
            .collect()
    }
}

impl ToTokens for ComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_table_methods,
            ..
        } = &self;
        let gen_struct::ComponentStruct {
            component_struct,
            id,
            fields,
            ..
        } = &self.component_struct;
        let new_field_args = fields.iter().map(|Field { ident, ty, .. }| {
            quote! { #ident: #ty }
        });
        let new_fields = fields.iter().map(|Field { ident, .. }| {
            quote! { #ident }
        });
        tokens.extend(quote! {
          impl #component_struct {
            pub fn new( #( #new_field_args, )* ) -> Self {
              Self {
                #id: 0,
                #(#new_fields, )*
              }
            }
            #(#component_table_methods)*
          }
        });
    }
}

pub struct Impl {
    component_structs: Vec<ComponentStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let macro_input::EntityMacroInput {
            component_declarations,
            ..
        } = entity_macro_input;
        let gen_struct::EntityStructs {
            component_structs,
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let _ = entity_traits;

        let component_structs = ComponentStruct::new_vec(
            component_declarations,
            with_component_structs,
            component_structs,
            entity_handle_struct,
        )?;

        Ok(Self { component_structs })
    }
}

impl ToTokens for Impl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self { component_structs } = self;
        tokens.extend(quote! {
            #(#component_structs)*
        });
    }
}
