secador::secador_multi!(
    seca_one!(
        (module, Type, new),
        [
            (delete_entity_trait, DeleteEntityTrait, new()),
            (
                new_entity_handle_trait,
                NewEntityHandleTrait,
                new(entity_handle_struct)
            ),
            (
                find_entity_handle_trait,
                FindEntityHandleTrait,
                new(entity_handle_struct)
            ),
            (
                with_entity_handle_trait,
                WithEntityHandleTrait,
                new(entity_handle_struct)
            )
        ]
    ),
    seca_many!(
        (module, Type, new, items),
        [
            (
                component_delete_trait,
                ComponentDeleteTrait,
                new_vec(component_declarations),
                component_delete_traits
            ),
            (
                component_trait,
                ComponentTrait,
                new_vec(component_declarations),
                component_traits
            ),
            (
                into_component_handle_trait,
                IntoComponentHandleTrait,
                new_vec(
                    component_declarations,
                    with_component_structs,
                    entity_handle_struct,
                )?,
                into_component_handle_traits
            ),
            (
                iter_component_trait,
                IterComponentTrait,
                new_vec(
                    component_declarations,
                    with_component_structs,
                    entity_handle_struct,
                )?,
                iter_component_traits
            ),
            (
                option_get_component_trait,
                OptionGetComponentTrait,
                new_vec(component_declarations),
                option_get_component_traits
            ),
            (
                option_with_component_trait,
                OptionWithComponentTrait,
                new_vec(component_declarations, with_component_structs,)?,
                option_with_component_traits
            ),
            (
                option_component_trait,
                OptionComponentTrait,
                new_vec(
                    component_declarations,
                    &option_get_component_traits,
                    with_component_structs
                )?,
                option_component_traits
            ),
            (
                option_component_iter_trait,
                OptionComponentIterTrait,
                new_vec(&option_with_component_traits),
                option_component_iter_traits
            ),
        ]
    ),
    seca_option!(
        (module, Type, new),
        [(
            new_entity_blob_trait,
            NewEntityBlobTrait,
            new(entity_blob_struct)
        )]
    ),
    {
        use structmeta::ToTokens;
        use syn::Result;

        use crate::{gen_struct, macro_input, rc_slice::RcSlice};

        seca_one!(2);
        pub use __module::__Type;
        mod __module;

        seca_many!(2);
        pub use __module::__Type;
        mod __module;

        seca_option!(2);
        pub use __module::__Type;
        mod __module;

        #[derive(ToTokens)]
        pub struct EntityTraits {
            __seca_one: __1,
            pub __module: __Type,
            __seca_many: __1,
            pub __items: RcSlice<__Type>,
            __seca_option: __1,
            pub __module: Option<__Type>,
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
                    entity_handle_struct,
                    entity_blob_struct,
                    ..
                } = entity_structs;
                let entity_blob_struct = entity_blob_struct.as_ref();

                seca_one!(1);
                let __module = __Type::__new;
                seca_many!(1);
                let __items = __Type::__new;
                seca_option!(1);
                let __module = __Type::__new;

                Ok(Self {
                    __seca_one: __1,
                    __module,
                    __seca_many: __1,
                    __items,
                    __seca_option: __1,
                    __module,
                })
            }
        }
    }
);
