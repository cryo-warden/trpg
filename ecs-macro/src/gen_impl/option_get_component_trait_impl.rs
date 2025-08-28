use crate::RcSlice;
use crate::gen_component_module::component_module::ComponentModule;
use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct PassthroughWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_module: ComponentModule,
}

impl PassthroughWithComponentStruct {
    pub fn new(wcs: &gen_struct::WithComponentStruct, cm: &ComponentModule) -> Self {
        Self {
            component_module: cm.to_owned(),
            with_component_struct: wcs.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        component_modules: &RcSlice<ComponentModule>,
    ) -> RcSlice<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_modules
                    .iter()
                    .filter(|cm| cm.module != wcs.component)
                    .map(|cm| Self::new(wcs, cm))
            })
            .collect()
    }
}

impl ToTokens for PassthroughWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let ComponentModule {
            module: module_name,
            option_get_component_trait,
            ..
        } = &self.component_module;
        let crate::gen_component_module::OptionGetComponentTrait {
            option_get_component_trait: option_get_ident,
            component_ty,
            getter_fn,
            ..
        } = option_get_component_trait;
        tokens.extend(quote! {
          impl<T: #module_name::#option_get_ident> #module_name::#option_get_ident for #with_component_struct<T> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              #module_name::#option_get_ident::#getter_fn(&self.value)
            }
          }
        });
    }
}

pub struct EntityHandleStruct {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub component_module: ComponentModule,
}

impl EntityHandleStruct {
    pub fn new(ehs: &gen_struct::EntityHandleStruct, cm: &ComponentModule) -> Result<Self> {
        Ok(Self {
            entity_handle_struct: ehs.to_owned(),
            component_module: cm.to_owned(),
        })
    }

    pub fn new_vec(
        entity_handle_struct: &gen_struct::EntityHandleStruct,
        component_modules: &RcSlice<ComponentModule>,
    ) -> Result<RcSlice<Self>> {
        component_modules
            .iter()
            .map(|cm| Self::new(entity_handle_struct, cm))
            .collect()
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            id,
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        let ComponentModule {
            module: module_name,
            option_get_component_trait,
            ..
        } = &self.component_module;
        let crate::gen_component_module::OptionGetComponentTrait {
            option_get_component_trait: option_get_ident,
            component_ty,
            table,
            getter_fn,
            ..
        } = option_get_component_trait;
        tokens.extend(quote! {
          impl<'a> #module_name::#option_get_ident for #entity_handle_struct<'a> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              ::spacetimedb::UniqueColumn::find(&self.ecs.db.#table().#id(), self.#id)
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    with_component_structs: RcSlice<PassthroughWithComponentStruct>,
    entity_handle_structs: RcSlice<EntityHandleStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
        component_modules: &RcSlice<crate::gen_component_module::component_module::ComponentModule>,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let _ = entity_traits;

        let gen_struct::EntityStructs {
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;

        let with_component_structs =
            PassthroughWithComponentStruct::new_vec(with_component_structs, component_modules);

        let entity_handle_structs =
            EntityHandleStruct::new_vec(entity_handle_struct, component_modules)?;

        Ok(Self {
            with_component_structs,
            entity_handle_structs,
        })
    }
}
