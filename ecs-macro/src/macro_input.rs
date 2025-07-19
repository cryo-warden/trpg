use crate::fundamental::{self, AddAttrs};
use proc_macro2::Span;
use quote::ToTokens;
use syn::{
    Attribute, Error, Ident, Item, ItemStruct, Result, Token, Type,
    parse::{Parse, ParseStream},
    spanned::Spanned,
};

mod kw {
    use syn::custom_keyword;
    custom_keyword!(table);
}

fn try_extract_attr(
    key: &str,
    mut attrs: Vec<Attribute>,
    spanned: impl Spanned,
) -> Result<(Attribute, fundamental::Attributes)> {
    let position = attrs
        .iter()
        .position(|attr| attr.path().is_ident(key))
        .ok_or(Error::new(
            spanned.span(),
            format!("Failed to find the `{}` attribute.", key),
        ))?;
    let attr = attrs.remove(position);
    let attrs = fundamental::Attributes(attrs);
    Ok((attr, attrs))
}

#[derive(Clone)]
pub struct StructAttrsDeclaration;

impl fundamental::AddAttrs for StructAttrsDeclaration {}

impl Default for StructAttrsDeclaration {
    fn default() -> Self {
        Self
    }
}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<StructAttrsDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (_, attrs) = try_extract_attr("struct_attrs", value.attrs.clone(), &value)?;

        Ok(StructAttrsDeclaration.add_attrs(attrs))
    }
}

/// Implement Spanned for StructAttrsDeclaration
impl ToTokens for StructAttrsDeclaration {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let _ = tokens;
    }
}

#[derive(Clone)]
pub struct ComponentTablePair {
    pub component: Ident,
    pub table: Ident,
}

impl Parse for ComponentTablePair {
    fn parse(input: ParseStream) -> Result<Self> {
        let component = input.parse()?;
        input.parse::<Token![in]>()?;
        let table = input.parse()?;
        Ok(Self { component, table })
    }
}

#[derive(Clone)]
pub struct ComponentDeclaration {
    pub component_ty: Ident,
    pub component_table_pairs: Vec<ComponentTablePair>,
    pub fields: fundamental::Fields,
}

impl fundamental::AddAttrs for ComponentDeclaration {}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<ComponentDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (component_attr, attrs) = try_extract_attr("component", value.attrs.clone(), &value)?;

        let component_table_pairs = component_attr.parse_args_with(|input: ParseStream| {
            Ok(input
                .parse_terminated(ComponentTablePair::parse, Token![,])?
                .into_iter()
                .collect())
        })?;
        let component_ty = value.ident.clone();
        let fields = fundamental::Fields(value.fields.clone().into_iter().collect());
        Ok(ComponentDeclaration {
            component_ty,
            fields,
            component_table_pairs,
        }
        .add_attrs(attrs))
    }
}

/// Implement Spanned for ComponentDeclaration
impl ToTokens for ComponentDeclaration {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let Self { component_ty, .. } = self;
        component_ty.to_tokens(tokens);
    }
}

pub struct EntityDeclaration {
    pub entity: Ident,
    pub id: Ident,
    pub id_ty: Type,
    pub table: Ident,
}

impl fundamental::AddAttrs for EntityDeclaration {}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<EntityDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (entity_attr, attrs) = try_extract_attr("entity", value.attrs.clone(), &value)?;

        let table = entity_attr.parse_args_with(|input: ParseStream| {
            input.parse::<kw::table>()?;
            input.parse::<Token![=]>()?;
            input.parse::<Ident>()
        })?;
        let entity = value.ident.clone();
        if value.fields.len() != 1 {
            return Err(Error::new(
                value.span(),
                "Entity type must have exactly one field for the ID.",
            ));
        }
        let id_field = value.fields.iter().next().ok_or(Error::new(
            value.span(),
            "Entity type must have exactly one field for the ID.",
        ))?;
        let id = id_field.ident.clone().ok_or(Error::new(
            id_field.span(),
            "Entity ID field must have an identifier.",
        ))?;
        let id_ty = id_field.ty.clone();
        Ok(EntityDeclaration {
            entity,
            id,
            id_ty,
            table,
        }
        .add_attrs(attrs))
    }
}

/// Implement Spanned for EntityDeclaration
impl ToTokens for EntityDeclaration {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let Self { entity, .. } = self;
        entity.to_tokens(tokens);
    }
}

pub struct BlobDeclaration {
    pub table: Ident,
}

impl fundamental::AddAttrs for BlobDeclaration {}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<BlobDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (blob_attr, attrs) = try_extract_attr("blob", value.attrs.clone(), &value)?;

        let table = blob_attr.parse_args_with(|input: ParseStream| {
            input.parse::<kw::table>()?;
            input.parse::<Token![=]>()?;
            input.parse::<Ident>()
        })?;
        // WIP Use this struct name instead of computing the blob name.
        // let blob = value.ident.clone();
        // WIP Capture fields and apply them to the blob.
        // `new_blob` function must take the added fields as parameters.
        // `deactivate` function must take them too.
        // Additional fields would allow DB index fields to be added.
        Ok(BlobDeclaration { table }.add_attrs(attrs))
    }
}

/// Implement Spanned for BlobDeclaration
impl ToTokens for BlobDeclaration {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let Self { table } = self;
        table.to_tokens(tokens);
    }
}

impl fundamental::AddAttrs for Item {}

pub struct EntityMacroInput {
    pub items: fundamental::TokensVec<Item>,
    pub entity_declaration: fundamental::WithAttrs<EntityDeclaration>,
    pub component_declarations: Vec<fundamental::WithAttrs<ComponentDeclaration>>,
    pub struct_attrs: fundamental::WithAttrs<StructAttrsDeclaration>,
    pub blob_declaration: Option<fundamental::WithAttrs<BlobDeclaration>>,
}

trait HasAttr {
    fn has_attr(&self, key: &str) -> bool;
}

impl HasAttr for ItemStruct {
    fn has_attr(&self, key: &str) -> bool {
        self.attrs.iter().any(|attr| attr.path().is_ident(key))
    }
}

fn validate_unary_vec<T: ToTokens>(name: &str, vec: &Vec<T>) -> Result<()> {
    if vec.len() <= 1 {
        Ok(())
    } else {
        Err(Error::new(
            Spanned::span(vec.into_iter()
                .nth(1)
                .ok_or(
                  Error::new(Span::call_site(),
                  format!("Impossible! Couldn't get second elemnt in vec with more than one element (name = {}).", name)))?
                 ),
            format!("Only one {} may be specified.", name),
        ))
    }
}

impl Parse for EntityMacroInput {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut items = vec![];
        let mut entity_declarations = vec![];
        let mut component_declarations = vec![];
        let mut struct_attrses = vec![];
        let mut blob_declarations = vec![];

        while !input.is_empty() {
            let item: Item = input.parse()?;
            match item {
                Item::Struct(item_struct) => {
                    if item_struct.has_attr("component") {
                        component_declarations.push(item_struct.try_into()?);
                    } else if item_struct.has_attr("entity") {
                        entity_declarations.push(item_struct.try_into()?);
                    } else if item_struct.has_attr("struct_attrs") {
                        struct_attrses.push(item_struct.try_into()?);
                    } else if item_struct.has_attr("blob") {
                        blob_declarations.push(item_struct.try_into()?);
                    } else {
                        items.push(Item::Struct(item_struct));
                    }
                }
                _ => {
                    items.push(item);
                }
            }
        }

        validate_unary_vec("entity_declaration", &entity_declarations)?;
        validate_unary_vec("struct_attrs", &struct_attrses)?;
        validate_unary_vec("blob_declaration", &blob_declarations)?;

        Ok(EntityMacroInput {
            items: items.into_iter().collect(),
            entity_declaration: entity_declarations.into_iter().next().ok_or(Error::new(
                input.span(),
                "An entity declaration must be specified.",
            ))?,
            component_declarations,
            struct_attrs: struct_attrses.into_iter().next().unwrap_or_default(),
            blob_declaration: blob_declarations.into_iter().next(),
        })
    }
}
