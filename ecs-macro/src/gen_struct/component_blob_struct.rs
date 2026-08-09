use super::reference::selector_ident;
use crate::{fundamental, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Field, Ident, Type};

/// Field attributes that only make sense on a table column; a blob struct is
/// plain data, so they must not appear on its fields.
const COLUMN_ATTRS: [&str; 4] = ["primary_key", "unique", "index", "auto_inc"];

pub fn blob_ident(component_ty: &Ident) -> Ident {
    format_ident!("{}Blob", component_ty)
}

/// Type-based reference detection: a declared component field is an entity
/// reference exactly when its type is the entity declaration's id type.
pub fn is_entity_ref(field: &Field, id_ty: &Type) -> bool {
    let field_ty = &field.ty;
    quote!(#field_ty).to_string() == quote!(#id_ty).to_string()
}

fn strip_column_attrs(field: &Field) -> Field {
    let mut field = field.to_owned();
    field
        .attrs
        .retain(|attr| !COLUMN_ATTRS.iter().any(|c| attr.path().is_ident(c)));
    field
}

/// Blob fields differ from the declared component fields in two ways: column
/// attrs are stripped, and entity-reference fields hold a selector instead of
/// a raw id.
fn to_blob_field(field: &Field, id_ty: &Type) -> Field {
    let mut field = strip_column_attrs(field);
    if is_entity_ref(&field, id_ty) {
        let selector = selector_ident();
        field.ty = Type::Verbatim(quote!(#selector));
    }
    field
}

#[derive(Clone)]
pub struct ComponentBlobStruct {
    pub attrs: fundamental::Attributes,
    pub component_struct: Ident,
    pub component_blob_struct: Ident,
    pub id: Ident,
    pub id_ty: Type,
    pub component_fields: fundamental::Fields,
    pub blob_fields: fundamental::Fields,
}

impl ComponentBlobStruct {
    pub fn new(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cwa: &fundamental::WithAttrs<macro_input::ComponentDeclaration>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> Self {
        Self {
            attrs: a.attrs.concat(&cwa.attrs),
            component_struct: cwa.component_ty.to_owned(),
            component_blob_struct: blob_ident(&cwa.component_ty),
            id: ewa.id.to_owned(),
            id_ty: ewa.id_ty.to_owned(),
            component_fields: cwa.fields.to_owned(),
            blob_fields: fundamental::Fields(
                cwa.fields
                    .iter()
                    .map(|f| to_blob_field(f, &ewa.id_ty))
                    .collect(),
            ),
        }
    }

    pub fn new_vec(
        a: &fundamental::WithAttrs<macro_input::StructAttrsDeclaration>,
        cds: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        ewa: &fundamental::WithAttrs<macro_input::EntityDeclaration>,
    ) -> RcSlice<Self> {
        cds.iter().map(|cwa| Self::new(a, cwa, ewa)).collect()
    }
}

impl ToTokens for ComponentBlobStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let ComponentBlobStruct {
            attrs,
            component_blob_struct,
            blob_fields,
            ..
        } = self;
        tokens.extend(quote! {
          #attrs
          #[derive(::spacetimedb::SpacetimeType)]
          pub struct #component_blob_struct {
            #blob_fields
          }
        });
    }
}
