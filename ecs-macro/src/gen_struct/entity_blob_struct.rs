use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Ident, Type};

#[derive(Clone)]
pub struct EntityBlobComponentField(pub macro_input::ComponentTablePair, pub Ident);

impl ToTokens for EntityBlobComponentField {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self(macro_input::ComponentTablePair { component, .. }, component_ty) = self;
        tokens.extend(quote! {
            pub #component: ::core::option::Option<#component_ty>
        })
    }
}

#[derive(Clone)]
pub struct EntityBlobStruct {
    pub attrs: fundamental::Attributes,
    pub table: fundamental::Table,
    pub entity_blob_struct: Ident,
    pub id: Ident,
    pub id_ty: Type,
    pub component_fields: Vec<EntityBlobComponentField>,
}

impl EntityBlobStruct {
    pub fn new(
        struct_attrs: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        blob_declaration: Option<&fundamental::WithAttrs<macro_input::BlobDeclaration>>,
        entity_declaration: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
    ) -> Option<Self> {
        blob_declaration.map(|blob_declaration| Self {
            attrs: struct_attrs.attrs.to_owned(),
            table: fundamental::Table(blob_declaration.table.to_owned()),
            entity_blob_struct: format_ident!("{}Blob", entity_declaration.entity),
            id: entity_declaration.id.to_owned(),
            id_ty: entity_declaration.id_ty.to_owned(),
            component_fields: component_declarations
                .iter()
                .flat_map(|cdwa| {
                    cdwa.component_table_pairs.iter().map(|ctp| {
                        EntityBlobComponentField(ctp.to_owned(), cdwa.component_ty.to_owned())
                    })
                })
                .collect(),
        })
    }
}

impl ToTokens for EntityBlobStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            attrs,
            table,
            entity_blob_struct,
            id,
            id_ty,
            component_fields,
        } = self;
        tokens.extend(quote! {
          #attrs
          #table
          pub struct #entity_blob_struct {
            pub #id: #id_ty,
            #(#component_fields,)*
          }
        })
    }
}
