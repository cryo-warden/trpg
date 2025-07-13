use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{ Result};

use crate::{gen_struct, gen_trait, macro_input};

mod component_delete_trait_impl;
mod component_struct_impl;
mod component_trait_impl;
mod find_entity_handle_trait_impl;
mod new_entity_handle_trait_impl;
mod option_component_iter_trait_impl;
mod option_component_trait_impl;
mod with_entity_handle_trait_impl;

pub struct EntityImpls {
    component_struct_impls: Vec<component_struct_impl::ComponentStruct>,
    new_entity_handle_trait_for_ecs_impl: new_entity_handle_trait_impl::EcsStruct,
    find_entity_handle_trait_for_ecs_impl: find_entity_handle_trait_impl::EcsStruct,
    with_entity_handle_trait_for_with_component_struct_impls:
        Vec<with_entity_handle_trait_impl::WithComponentStruct>,
    replacement_component_trait_for_with_component_struct_impls:
        Vec<component_trait_impl::ReplacementWithComponentStruct>,
    replacement_component_delete_trait_for_with_component_struct_impls:
        Vec<component_delete_trait_impl::ReplacementWithComponentStruct>,
    component_trait_for_with_component_struct_impls:
        Vec<component_trait_impl::PassthroughWithComponentStruct>,
    component_delete_trait_for_with_component_struct_impls:
        Vec<component_delete_trait_impl::PassthroughWithComponentStruct>,
    option_component_trait_for_with_component_struct_impls:
        Vec<option_component_trait_impl::PassthroughWithComponentStruct>,
    option_component_trait_for_entity_handle_struct_impls:
        Vec<option_component_trait_impl::EntityHandleStruct>,
    option_component_iter_trait_impls:
        Vec<option_component_iter_trait_impl::OptionComponentIterator>,
    with_entity_handle_trait_for_entity_handle_struct_impl:
        with_entity_handle_trait_impl::EntityHandleStruct,
}

impl EntityImpls {
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
            entity_struct,
            component_structs,
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            new_entity_handle_trait,
            find_entity_handle_trait,
            component_traits,
            component_delete_traits,
            with_entity_id_trait,
            option_component_traits,
            option_component_iter_traits,
        } = entity_traits;

        let component_struct_impls = component_struct_impl::ComponentStruct::new_vec(
            component_declarations,
            with_component_structs,
            component_structs,
            entity_handle_struct,
        )?;

        let new_entity_handle_trait_for_ecs_impl = new_entity_handle_trait_impl::EcsStruct::new(
            new_entity_handle_trait,
            entity_struct,
            entity_handle_struct,
        );

        let find_entity_handle_trait_for_ecs_impl = find_entity_handle_trait_impl::EcsStruct::new(
            find_entity_handle_trait,
            entity_handle_struct,
        );

        let with_entity_handle_trait_for_with_component_struct_impls =
            with_entity_handle_trait_impl::WithComponentStruct::new_vec(
                with_component_structs,
                with_entity_id_trait,
            );

        let replacement_component_trait_for_with_component_struct_impls =
            component_trait_impl::ReplacementWithComponentStruct::new_vec(
                with_component_structs,
                component_traits,
                option_component_traits,
            )?;

        let replacement_component_delete_trait_for_with_component_struct_impls =
            component_delete_trait_impl::ReplacementWithComponentStruct::new_vec(
                with_component_structs,
                component_delete_traits,
                option_component_traits,
            )?;

        let component_trait_for_with_component_struct_impls =
            component_trait_impl::PassthroughWithComponentStruct::new_vec(
                with_component_structs,
                component_traits,
            );

        let component_delete_trait_for_with_component_struct_impls =
            component_delete_trait_impl::PassthroughWithComponentStruct::new_vec(
                with_component_structs,
                component_delete_traits,
            );

        let option_component_trait_for_with_component_struct_impls =
            option_component_trait_impl::PassthroughWithComponentStruct::new_vec(
                with_component_structs,
                option_component_traits,
            );

        let option_component_trait_for_entity_handle_struct_impls =
            option_component_trait_impl::EntityHandleStruct::new_vec(
                entity_handle_struct,
                option_component_traits,
            );

        let option_component_iter_trait_impls =
            option_component_iter_trait_impl::OptionComponentIterator::new_vec(
                option_component_iter_traits,
            );

        let with_entity_handle_trait_for_entity_handle_struct_impl =
            with_entity_handle_trait_impl::EntityHandleStruct::new(
                entity_handle_struct,
                with_entity_id_trait,
            );

        Ok(Self {
            component_struct_impls,
            new_entity_handle_trait_for_ecs_impl,
            find_entity_handle_trait_for_ecs_impl,
            with_entity_handle_trait_for_with_component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            replacement_component_delete_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            component_delete_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
            with_entity_handle_trait_for_entity_handle_struct_impl,
        })
    }
}

impl ToTokens for EntityImpls {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_struct_impls,
            new_entity_handle_trait_for_ecs_impl,
            find_entity_handle_trait_for_ecs_impl,
            with_entity_handle_trait_for_with_component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            replacement_component_delete_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            component_delete_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
            with_entity_handle_trait_for_entity_handle_struct_impl,
        } = self;
        tokens.extend(quote! {
            #(#component_struct_impls)*
            #new_entity_handle_trait_for_ecs_impl
            #find_entity_handle_trait_for_ecs_impl
            #(#with_entity_handle_trait_for_with_component_struct_impls)*
            #(#replacement_component_trait_for_with_component_struct_impls)*
            #(#replacement_component_delete_trait_for_with_component_struct_impls)*
            #(#component_trait_for_with_component_struct_impls)*
            #(#component_delete_trait_for_with_component_struct_impls)*
            #(#option_component_trait_for_with_component_struct_impls)*
            #(#option_component_trait_for_entity_handle_struct_impls)*
            #(#option_component_iter_trait_impls)*
            #with_entity_handle_trait_for_entity_handle_struct_impl
        });
    }
}
