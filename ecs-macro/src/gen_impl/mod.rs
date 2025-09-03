use crate::{gen_struct, gen_trait, macro_input};
use structmeta::ToTokens;
use syn::Result;

secador::secador!(
    impl_name,
    [
        component_delete_trait_impl,
        component_struct_impl,
        component_trait_impl,
        delete_entity_trait_impl,
        find_entity_handle_trait_impl,
        into_component_handle_trait_impl,
        iter_component_trait_impl,
        new_entity_blob_trait_impl,
        new_entity_handle_trait_impl,
        option_component_iter_trait_impl,
        option_component_trait_impl,
        option_get_component_trait_impl,
        option_with_component_trait_impl,
        with_entity_handle_trait_impl,
    ],
    {
        seca!(1);
        mod __impl_name;

        #[derive(ToTokens)]
        pub struct EntityImpls {
            __seca: __1,
            __impl_name: __impl_name::Impl,
        }

        impl EntityImpls {
            pub fn new(
                entity_macro_input: &macro_input::EntityMacroInput,
                entity_structs: &gen_struct::EntityStructs,
                entity_traits: &gen_trait::EntityTraits,
            ) -> Result<Self> {
                seca!(1);
                let __impl_name =
                    __impl_name::Impl::new(entity_macro_input, entity_structs, entity_traits)?;
                Ok(Self {
                    __seca: __1,
                    __impl_name,
                })
            }
        }
    }
);
