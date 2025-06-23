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
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_joined(&ewa.attrs),
            tables: ewa.value.tables.to_owned(),
            entity_struct: ewa.value.entity.to_owned(),
            id_ty: ewa.value.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityStruct {
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
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_owned(),
            entity_handle_struct: format_ident!("{}Handle", ewa.value.entity),
            id: ewa.value.id.to_owned(),
            id_ty: ewa.value.id_ty.to_owned(),
        }
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityHandleStruct {
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
