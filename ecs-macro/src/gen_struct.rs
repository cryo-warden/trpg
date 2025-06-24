use proc_macro2::TokenStream;
use quote::ToTokens;
use quote::format_ident;
use quote::quote;
use syn::Ident;

use crate::{fundamental, macro_input};

#[derive(Clone)]
pub struct EntityStruct {
    pub attrs: fundamental::Attributes,
    pub tables: fundamental::Tables,
    pub entity_struct: Ident,
    pub id_ty: Ident,
}

impl EntityStruct {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: struct_attrs.attrs.to_joined(&entity_declaration.attrs),
            tables: entity_declaration.value.tables.to_owned(),
            entity_struct: entity_declaration.value.entity.to_owned(),
            id_ty: entity_declaration.value.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            tables,
            entity_struct,
            id_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #entity_struct {
            #[primary_key]
            #[auto_inc]
            pub id: #id_ty,
          }
        });
    }
}

#[derive(Clone)]
pub struct ComponentStruct {
    pub attrs: fundamental::Attributes,
    pub tables: fundamental::Tables,
    pub component_struct: Ident,
    pub id: Ident,
    pub id_ty: Ident,
    pub fields: fundamental::Fields,
}

impl ComponentStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cwa: &fundamental::WithAttrs<macro_input::ComponentDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_joined(&cwa.attrs),
            tables: fundamental::Tables(
                cwa.value
                    .component_table_pairs
                    .iter()
                    .map(|ctp| ctp.table.to_owned())
                    .collect(),
            ),
            component_struct: cwa.value.component_ty.to_owned(),
            id: ewa.value.id.to_owned(),
            id_ty: ewa.value.id_ty.to_owned(),
            fields: cwa.value.fields.to_owned(),
        }
    }

    pub fn new_vec(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cds: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Vec<Self> {
        cds.iter().map(|cwa| Self::new(a, cwa, ewa)).collect()
    }
}

impl ToTokens for ComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let ComponentStruct {
            attrs,
            tables,
            component_struct,
            id,
            id_ty,
            fields,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #component_struct {
            #[primary_key]
            pub #id: #id_ty,
            #fields
          }
        });
    }
}

#[derive(Clone)]
pub struct EntityHandleStruct {
    pub attrs: fundamental::Attributes,
    pub entity_handle_struct: Ident,
    pub id: Ident,
    pub id_ty: Ident,
}

impl EntityHandleStruct {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: struct_attrs.attrs.to_owned(),
            entity_handle_struct: format_ident!("{}Handle", entity_declaration.value.entity),
            id: entity_declaration.value.id.to_owned(),
            id_ty: entity_declaration.value.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            entity_handle_struct,
            id,
            id_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          pub struct #entity_handle_struct<'a> {
            hidden: ecs::EntityHandleHidden<'a>,
            pub #id: #id_ty,
          }
        })
    }
}

#[derive(Clone)]
pub struct WithComponentStruct {
    pub attrs: fundamental::Attributes,
    pub with_component_struct: Ident,
    pub component: Ident,
    pub component_ty: Ident,
}

impl WithComponentStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ctp: &macro_input::ComponentTablePair,
        cwa: &fundamental::WithAttrs<macro_input::ComponentDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_owned(),
            with_component_struct: format_ident!("With__{}__Component", ctp.component),
            component: ctp.component.to_owned(),
            component_ty: cwa.value.component_ty.to_owned(),
        }
    }

    pub fn new_vec(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cds: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> Vec<Self> {
        cds.iter()
            .flat_map(|d| {
                d.value
                    .component_table_pairs
                    .iter()
                    .map(|ctp| Self::new(a, ctp, d))
            })
            .collect()
    }
}

impl ToTokens for WithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            with_component_struct,
            component,
            component_ty,
        } = self;
        tokens.extend(quote! {
          #attrs
          #[allow(non_camel_case_types)]
          pub struct #with_component_struct<T> {
            #component: #component_ty,
            value: T,
          }
        })
    }
}

pub struct EntityStructs {
    pub entity_struct: EntityStruct,
    pub component_structs: Vec<ComponentStruct>,
    pub entity_handle_struct: EntityHandleStruct,
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
        let with_component_structs =
            WithComponentStruct::new_vec(&struct_attrs, &component_declarations);

        Self {
            entity_struct,
            component_structs,
            entity_handle_struct,
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
            with_component_structs,
        } = self;
        tokens.extend(quote! {
          #entity_struct
          #(#component_structs)*
          #entity_handle_struct
          #(#with_component_structs)*
        });
    }
}
