use crate::fundamental::{self, AddAttrs};
use syn::{
    Error, Ident, Item, Result, Token, bracketed,
    parse::{Parse, ParseStream},
    spanned::Spanned,
};

mod kw {
    use syn::custom_keyword;
    custom_keyword!(struct_attrs);
    custom_keyword!(component);
    custom_keyword!(entity);
    custom_keyword!(blob);
}

#[derive(Clone)]
pub struct StructAttrsDeclaration;

impl fundamental::AddAttrs for StructAttrsDeclaration {}

impl Parse for StructAttrsDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::struct_attrs>()?;
        input.parse::<Token![;]>()?;
        Ok(StructAttrsDeclaration)
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

impl Parse for ComponentDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::component>()?;
        let component_ty = input.parse()?;
        let content;
        bracketed!(content in input);
        let component_table_pairs = content
            .parse_terminated(ComponentTablePair::parse, Token![,])?
            .into_iter()
            .collect();
        let fields = input.parse()?;
        Ok(Self {
            component_ty,
            component_table_pairs,
            fields,
        })
    }
}

pub struct EntityDeclaration {
    pub entity: Ident,
    pub id: Ident,
    pub id_ty: Ident,
    pub table: Ident,
}

impl fundamental::AddAttrs for EntityDeclaration {}

impl Parse for EntityDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::entity>()?;
        let entity = input.parse()?;
        let id = input.parse()?;
        input.parse::<Token![:]>()?;
        let id_ty = input.parse()?;
        input.parse::<Token![in]>()?;
        let table = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(Self {
            entity,
            id,
            id_ty,
            table,
        })
    }
}

pub struct BlobDeclaration {
    pub table: Ident,
}

impl fundamental::AddAttrs for BlobDeclaration {}

impl Parse for BlobDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::blob>()?;
        input.parse::<Token![in]>()?;
        let table = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(Self { table })
    }
}

impl fundamental::AddAttrs for Item {}

pub struct EntityMacroInput {
    pub items: Vec<fundamental::WithAttrs<Item>>,
    pub entity_declaration: fundamental::WithAttrs<EntityDeclaration>,
    pub component_declarations: Vec<fundamental::WithAttrs<ComponentDeclaration>>,
    pub struct_attrs: fundamental::WithAttrs<StructAttrsDeclaration>,
    pub blob_declaration: Option<fundamental::WithAttrs<BlobDeclaration>>,
}

impl Parse for EntityMacroInput {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut items = vec![];
        let mut entity_declarations = vec![];
        let mut component_declarations = vec![];
        let mut struct_attrses = vec![];
        let mut blob_declarations = vec![];
        while !input.is_empty() {
            let attrs = input.parse()?;
            let la = input.lookahead1();
            if la.peek(kw::entity) {
                let entity = input.parse::<EntityDeclaration>()?.add_attrs(attrs);
                if entity_declarations.len() > 0 {
                    return Err(Error::new(
                        entity.entity.span(),
                        "Only one entity declaration is allowed.",
                    ));
                }
                entity_declarations.push(entity);
            } else if la.peek(kw::component) {
                component_declarations
                    .push(input.parse::<ComponentDeclaration>()?.add_attrs(attrs));
            } else if la.peek(kw::struct_attrs) {
                if struct_attrses.len() > 0 {
                    let struct_attrs = input.parse::<kw::struct_attrs>()?;
                    return Err(Error::new(
                        struct_attrs.span(),
                        "Only one struct_attrs declaration is allowed.",
                    ));
                }
                struct_attrses.push(input.parse::<StructAttrsDeclaration>()?.add_attrs(attrs));
            } else if la.peek(kw::component) {
                component_declarations
                    .push(input.parse::<ComponentDeclaration>()?.add_attrs(attrs));
            } else if la.peek(kw::blob) {
                if blob_declarations.len() > 0 {
                    let blob = input.parse::<kw::blob>()?;
                    return Err(Error::new(
                        blob.span(),
                        "Only one blob declaration is allowed.",
                    ));
                }
                blob_declarations.push(input.parse::<BlobDeclaration>()?.add_attrs(attrs));
            } else {
                let item: Item = input.parse()?;
                items.push(item.add_attrs(attrs));
            }
        }

        if entity_declarations.len() < 1 {
            return Err(Error::new(
                input.span(),
                "An entity declaration must be specified.",
            ));
        }

        struct_attrses.push(StructAttrsDeclaration.add_attrs(fundamental::Attributes(vec![])));

        Ok(EntityMacroInput {
            items,
            entity_declaration: entity_declarations.remove(0),
            component_declarations,
            struct_attrs: struct_attrses.remove(0),
            blob_declaration: blob_declarations.into_iter().nth(0),
        })
    }
}
