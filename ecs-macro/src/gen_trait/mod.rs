secador::secador!(
    (module, Type, new, field, FieldType),
    [
        (
            delete_entity_trait,
            DeleteEntityTrait,
            new(),
            delete_entity_trait,
            DeleteEntityTrait,
        ),
        (
            new_entity_handle_trait,
            NewEntityHandleTrait,
            new(entity_handle_struct),
            new_entity_handle_trait,
            NewEntityHandleTrait,
        ),
        (
            find_entity_handle_trait,
            FindEntityHandleTrait,
            new(entity_handle_struct),
            find_entity_handle_trait,
            FindEntityHandleTrait,
        ),
        (
            with_entity_handle_trait,
            WithEntityHandleTrait,
            new(entity_handle_struct),
            with_entity_handle_trait,
            WithEntityHandleTrait,
        ),
        (
            component_delete_trait,
            ComponentDeleteTrait,
            new_vec(component_declarations),
            component_delete_traits,
            Type![RcSlice<ComponentDeleteTrait>],
        ),
        (
            component_trait,
            ComponentTrait,
            new_vec(component_declarations),
            component_traits,
            Type![RcSlice<ComponentTrait>],
        ),
        (
            into_component_handle_trait,
            IntoComponentHandleTrait,
            new_vec(
                component_declarations,
                with_component_structs,
                entity_handle_struct,
            )?,
            into_component_handle_traits,
            Type![RcSlice<IntoComponentHandleTrait>],
        ),
        (
            iter_component_trait,
            IterComponentTrait,
            new_vec(
                component_declarations,
                with_component_structs,
                entity_handle_struct,
            )?,
            iter_component_traits,
            Type![RcSlice<IterComponentTrait>],
        ),
        (
            option_get_component_trait,
            OptionGetComponentTrait,
            new_vec(component_declarations),
            option_get_component_traits,
            Type![RcSlice<OptionGetComponentTrait>],
        ),
        (
            option_with_component_trait,
            OptionWithComponentTrait,
            new_vec(component_declarations, with_component_structs)?,
            option_with_component_traits,
            Type![RcSlice<OptionWithComponentTrait>],
        ),
        (
            option_component_trait,
            OptionComponentTrait,
            new_vec(
                component_declarations,
                &option_get_component_traits,
                with_component_structs
            )?,
            option_component_traits,
            Type![RcSlice<OptionComponentTrait>],
        ),
        (
            option_component_iter_trait,
            OptionComponentIterTrait,
            new_vec(&option_with_component_traits),
            option_component_iter_traits,
            Type![RcSlice<OptionComponentIterTrait>],
        ),
        (
            new_entity_blob_trait,
            NewEntityBlobTrait,
            new(entity_blob_struct),
            new_entity_blob_trait,
            Type![Option<NewEntityBlobTrait>],
        ),
    ],
    {
        use crate::{gen_struct, macro_input, rc_slice::RcSlice};

        seca!(2);
        pub use __module::__Type;
        mod __module;

        #[derive(structmeta::ToTokens)]
        pub struct EntityTraits {
            __seca: __1,
            pub __field: __FieldType,
        }

        impl EntityTraits {
            pub fn new(
                entity_macro_input: &macro_input::EntityMacroInput,
                entity_structs: &gen_struct::EntityStructs,
            ) -> syn::Result<Self> {
                let macro_input::EntityMacroInput {
                    component_declarations,
                    ..
                } = entity_macro_input;
                let gen_struct::EntityStructs {
                    with_component_structs,
                    entity_handle_struct,
                    entity_blob_struct,
                    ..
                } = entity_structs;
                let entity_blob_struct = entity_blob_struct.as_ref();

                seca!(1);
                let __field = __Type::__new;

                Ok(Self {
                    __seca: __1,
                    __field,
                })
            }
        }
    }
);
