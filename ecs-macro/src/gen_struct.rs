use crate::macro_input;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};

pub mod component_struct;
pub mod entity_blob_struct;
pub mod entity_handle_struct;
pub mod entity_struct;
pub mod with_component_struct;

pub use component_struct::ComponentStruct;
pub use entity_blob_struct::EntityBlobStruct;
pub use entity_handle_struct::EntityHandleStruct;
pub use entity_struct::EntityStruct;
pub use with_component_struct::WithComponentStruct;

pub struct EntityStructs {
    pub entity_struct: EntityStruct,
    pub component_structs: Vec<ComponentStruct>,
    pub entity_handle_struct: EntityHandleStruct,
    pub entity_blob_struct: EntityBlobStruct,
    pub with_component_structs: Vec<WithComponentStruct>,
}

impl EntityStructs {
    pub fn new(entity_macro_input: &macro_input::EntityMacroInput) -> Self {
        let macro_input::EntityMacroInput {
            entity_declaration,
            component_declarations,
            struct_attrs,
        } = entity_macro_input;

        let entity_struct = EntityStruct::new(&struct_attrs, &entity_declaration);
        let component_structs =
            ComponentStruct::new_vec(&struct_attrs, &component_declarations, &entity_declaration);
        let entity_handle_struct = EntityHandleStruct::new(&struct_attrs, &entity_declaration);
        let entity_blob_struct =
            EntityBlobStruct::new(&struct_attrs, &entity_declaration, &component_declarations);
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

impl ToTokens for EntityStructs {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            entity_struct,
            component_structs,
            entity_handle_struct,
            entity_blob_struct,
            with_component_structs,
        } = self;
        tokens.extend(quote! {
          #entity_struct
          #(#component_structs)*
          #entity_handle_struct
          #entity_blob_struct
          #(#with_component_structs)*
        });
    }
}
