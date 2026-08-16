use crate::{
    RcSlice,
    fundamental::{self, AddAttrs},
};
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
    custom_keyword!(dirties);
    custom_keyword!(transient);
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
    Ok((attr, attrs.into()))
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
    /// Component names (flags) that every mutation of this component's
    /// tables auto-inserts, so a dirty flag can never be forgotten.
    pub dirties: Vec<Ident>,
    /// TRANSIENT: the component's tables hold state that exists only within a
    /// single game tick (one reducer transaction). Backed by SpacetimeDB's
    /// `event` table attribute, whose rows do not persist past the
    /// transaction — so no cleanup is needed. (If that contract ever changes,
    /// this flag is the one place to add our own per-tick cleanup.)
    pub transient: bool,
    pub fields: fundamental::Fields,
}

/// One argument inside #[component(...)]: a `name in table` pair, a
/// `dirties(a, b)` list, or the `transient` marker.
enum ComponentAttrArg {
    Pair(ComponentTablePair),
    Dirties(Vec<Ident>),
    Transient,
}

impl Parse for ComponentAttrArg {
    fn parse(input: ParseStream) -> Result<Self> {
        if input.peek(kw::transient) {
            input.parse::<kw::transient>()?;
            return Ok(Self::Transient);
        }
        if input.peek(kw::dirties) {
            input.parse::<kw::dirties>()?;
            let content;
            syn::parenthesized!(content in input);
            let names = content
                .parse_terminated(Ident::parse, Token![,])?
                .into_iter()
                .collect();
            return Ok(Self::Dirties(names));
        }
        Ok(Self::Pair(input.parse()?))
    }
}

impl fundamental::AddAttrs for ComponentDeclaration {}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<ComponentDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (component_attr, attrs) = try_extract_attr("component", value.attrs.clone(), &value)?;

        let args: Vec<ComponentAttrArg> = component_attr.parse_args_with(|input: ParseStream| {
            Ok(input
                .parse_terminated(ComponentAttrArg::parse, Token![,])?
                .into_iter()
                .collect())
        })?;
        let mut component_table_pairs = Vec::new();
        let mut dirties = Vec::new();
        let mut transient = false;
        for arg in args {
            match arg {
                ComponentAttrArg::Pair(pair) => component_table_pairs.push(pair),
                ComponentAttrArg::Dirties(names) => dirties.extend(names),
                ComponentAttrArg::Transient => transient = true,
            }
        }
        let component_ty = value.ident.clone();
        let fields = fundamental::Fields(value.fields.clone().into_iter().collect());
        Ok(ComponentDeclaration {
            component_ty,
            fields,
            component_table_pairs,
            dirties,
            transient,
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

pub struct RegistryDeclaration {
    pub registry_row: Ident,
    pub table: Ident,
}

impl fundamental::AddAttrs for RegistryDeclaration {}

impl TryFrom<ItemStruct> for fundamental::WithAttrs<RegistryDeclaration> {
    type Error = syn::Error;
    fn try_from(value: ItemStruct) -> syn::Result<Self> {
        let (registry_attr, attrs) = try_extract_attr("registry", value.attrs.clone(), &value)?;

        let table = registry_attr.parse_args_with(|input: ParseStream| {
            input.parse::<kw::table>()?;
            input.parse::<Token![=]>()?;
            input.parse::<Ident>()
        })?;
        if !value.fields.is_empty() {
            return Err(Error::new(
                value.span(),
                "Registry type must not declare fields; they are generated.",
            ));
        }
        Ok(RegistryDeclaration {
            registry_row: value.ident.clone(),
            table,
        }
        .add_attrs(attrs))
    }
}

/// Implement Spanned for RegistryDeclaration
impl ToTokens for RegistryDeclaration {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let Self { registry_row, .. } = self;
        registry_row.to_tokens(tokens);
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
    pub items: RcSlice<Item>,
    pub entity_declaration: fundamental::WithAttrs<EntityDeclaration>,
    pub component_declarations: RcSlice<fundamental::WithAttrs<ComponentDeclaration>>,
    pub struct_attrs: fundamental::WithAttrs<StructAttrsDeclaration>,
    pub blob_declaration: Option<fundamental::WithAttrs<BlobDeclaration>>,
    pub registry_declaration: fundamental::WithAttrs<RegistryDeclaration>,
}

trait HasAttr {
    fn has_attr(&self, key: &str) -> bool;
}

impl HasAttr for ItemStruct {
    fn has_attr(&self, key: &str) -> bool {
        self.attrs.iter().any(|attr| attr.path().is_ident(key))
    }
}

fn validate_unary_slice<T: ToTokens>(name: &str, items: &[T]) -> Result<()> {
    if items.len() <= 1 {
        Ok(())
    } else {
        Err(Error::new(
            Spanned::span(items.into_iter()
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
        let mut registry_declarations = vec![];

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
                    } else if item_struct.has_attr("registry") {
                        registry_declarations.push(item_struct.try_into()?);
                    } else {
                        items.push(Item::Struct(item_struct));
                    }
                }
                _ => {
                    items.push(item);
                }
            }
        }

        validate_unary_slice("entity_declaration", &entity_declarations)?;
        validate_unary_slice("struct_attrs", &struct_attrses)?;
        validate_unary_slice("blob_declaration", &blob_declarations)?;
        validate_unary_slice("registry_declaration", &registry_declarations)?;

        Ok(EntityMacroInput {
            items: items.into_iter().collect(),
            entity_declaration: entity_declarations.into_iter().next().ok_or(Error::new(
                input.span(),
                "An entity declaration must be specified.",
            ))?,
            component_declarations: component_declarations.into(),
            struct_attrs: struct_attrses.into_iter().next().unwrap_or_default(),
            blob_declaration: blob_declarations.into_iter().next(),
            registry_declaration: registry_declarations.into_iter().next().ok_or(Error::new(
                input.span(),
                "A registry declaration must be specified: entity references in blobs resolve names through the registry.",
            ))?,
        })
    }
}
