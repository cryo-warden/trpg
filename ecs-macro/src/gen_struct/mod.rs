use crate::{macro_input, rc_slice::RcSlice};
pub use component_struct::ComponentStruct;
pub use entity_blob_struct::{EntityBlobComponentField, EntityBlobStruct};
pub use entity_handle_struct::EntityHandleStruct;
pub use entity_struct::EntityStruct;
use structmeta::ToTokens;
pub use with_component_struct::WithComponentStruct;

mod component_struct;
mod entity_blob_struct;
mod entity_handle_struct;
mod entity_struct;
mod with_component_struct;

#[derive(ToTokens)]
pub struct EntityStructs {
    pub entity_struct: EntityStruct,
    pub component_structs: RcSlice<ComponentStruct>,
    pub entity_handle_struct: EntityHandleStruct,
    pub entity_blob_struct: Option<EntityBlobStruct>,
    pub with_component_structs: RcSlice<WithComponentStruct>,
}

impl EntityStructs {
    pub fn new(entity_macro_input: &macro_input::EntityMacroInput) -> Self {
        let macro_input::EntityMacroInput {
            blob_declaration,
            entity_declaration,
            component_declarations,
            struct_attrs,
            ..
        } = &entity_macro_input;
        let blob_declaration = blob_declaration.as_ref();

        let entity_struct = EntityStruct::new(struct_attrs, entity_declaration);
        let component_structs =
            ComponentStruct::new_vec(struct_attrs, component_declarations, entity_declaration);
        let entity_handle_struct = EntityHandleStruct::new(struct_attrs, entity_declaration);
        let entity_blob_struct = EntityBlobStruct::new(
            struct_attrs,
            blob_declaration,
            entity_declaration,
            component_declarations,
        );
        let with_component_structs =
            WithComponentStruct::new_vec(&struct_attrs, &component_declarations);

        Self {
            entity_struct,
            component_structs,
            entity_handle_struct,
            entity_blob_struct,
            with_component_structs,
        }
    }
}
