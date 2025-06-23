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
    pub struct_name: Ident,
    pub id_ty_name: Ident,
}

impl EntityStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_joined(&ewa.attrs),
            tables: ewa.value.tables.to_owned(),
            struct_name: ewa.value.name.to_owned(),
            id_ty_name: ewa.value.id_ty_name.to_owned(),
        }
    }
}

impl ToTokens for EntityStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityStruct {
            attrs,
            tables,
            struct_name: name,
            id_ty_name,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #name {
            #[primary_key]
            #[auto_inc]
            pub id: #id_ty_name,
          }
        });
    }
}

#[derive(Clone)]
pub struct ComponentStruct {
    pub attrs: fundamental::Attributes,
    pub tables: fundamental::Tables,
    pub struct_name: Ident,
    pub id_name: Ident,
    pub id_ty_name: Ident,
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
                    .name_table_pairs
                    .iter()
                    .map(|ntp| ntp.table_name.to_owned())
                    .collect(),
            ),
            struct_name: cwa.value.ty_name.to_owned(),
            id_name: ewa.value.id_name.to_owned(),
            id_ty_name: ewa.value.id_ty_name.to_owned(),
            fields: cwa.value.fields.to_owned(),
        }
    }
}

impl ToTokens for ComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let ComponentStruct {
            attrs,
            tables,
            struct_name,
            id_name,
            id_ty_name,
            fields,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #struct_name {
            #[primary_key]
            pub #id_name: #id_ty_name,
            #fields
          }
        });
    }
}

#[derive(Clone)]
pub struct EntityHandleStruct {
    pub attrs: fundamental::Attributes,
    pub struct_name: Ident,
    pub id_name: Ident,
    pub id_ty_name: Ident,
}

impl EntityHandleStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        let struct_name = format_ident!("{}Handle", ewa.value.name);
        Self {
            attrs: a.attrs.to_owned(),
            struct_name,
            id_name: ewa.value.id_name.to_owned(),
            id_ty_name: ewa.value.id_ty_name.to_owned(),
        }
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityHandleStruct {
            attrs,
            struct_name,
            id_name,
            id_ty_name,
        } = self;
        tokens.extend(quote! {
          #attrs
          pub struct #struct_name<'a> {
            hidden: ecs::EntityHandleHidden<'a>,
            pub #id_name: #id_ty_name,
          }
        })
    }
}

#[derive(Clone)]
pub struct WithComponentStruct {
    pub attrs: fundamental::Attributes,
    pub struct_name: Ident,
    pub component_name: Ident,
    pub component_ty_name: Ident,
}

impl WithComponentStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        ntp: &macro_input::ComponentNameTablePair,
        cwa: &fundamental::WithAttrs<macro_input::ComponentDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.to_owned(),
            struct_name: format_ident!("With__{}__Component", ntp.name),
            component_name: ntp.name.to_owned(),
            component_ty_name: cwa.value.ty_name.to_owned(),
        }
    }
}

impl ToTokens for WithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            struct_name: with_component_name,
            component_name,
            component_ty_name,
        } = self;
        tokens.extend(quote! {
          #attrs
          #[allow(non_camel_case_types)]
          pub struct #with_component_name<T> {
            #component_name: #component_ty_name,
            value: T,
          }
        })
    }
}
