use crate::{fundamental, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{Ident, Type};

#[derive(Clone)]
pub struct ComponentStruct {
    pub attrs: fundamental::Attributes,
    pub tables: fundamental::Tables,
    pub component_struct: Ident,
    pub id: Ident,
    pub id_ty: Type,
    pub component_fields: fundamental::Fields,
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
                cwa.component_table_pairs
                    .iter()
                    .map(|ctp| ctp.table.to_owned())
                    .collect(),
            ),
            component_struct: cwa.component_ty.to_owned(),
            id: ewa.id.to_owned(),
            id_ty: ewa.id_ty.to_owned(),
            component_fields: cwa.fields.to_owned(),
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
            component_fields,
        } = self;
        tokens.extend(quote! {
          #attrs
          #tables
          pub struct #component_struct {
            #[primary_key]
            pub #id: #id_ty,
            #component_fields
          }
        });
    }
}
