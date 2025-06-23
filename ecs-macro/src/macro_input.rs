use crate::{
    fundamental::{self, AddAttrs},
    kw,
};
use syn::{
    Error, Ident, Result, Token, bracketed, parenthesized,
    parse::{Parse, ParseStream},
    spanned::Spanned,
};

#[derive(Clone)]
pub struct StructAttrsDeclaration;

impl fundamental::AddAttrs for StructAttrsDeclaration {}

impl Parse for StructAttrsDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::struct_attrs>()?;
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
        let content;
        parenthesized!(content in input);
        let component = content.parse()?;
        content.parse::<Token![,]>()?;
        let table = content.parse()?;
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
    pub tables: fundamental::Tables,
}

impl fundamental::AddAttrs for EntityDeclaration {}

impl Parse for EntityDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::entity>()?;
        let entity = input.parse()?;
        let id = input.parse()?;
        input.parse::<Token![:]>()?;
        let id_ty = input.parse()?;
        let tables = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(Self {
            entity,
            id,
            id_ty,
            tables,
        })
    }
}
pub struct EntityMacroInput {
    pub entity_declaration: fundamental::WithAttrs<EntityDeclaration>,
    pub component_declarations: Vec<fundamental::WithAttrs<ComponentDeclaration>>,
    pub struct_attrs: fundamental::WithAttrs<StructAttrsDeclaration>,
}

impl Parse for EntityMacroInput {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut entity_declarations = vec![];
        let mut component_declarations = vec![];
        let mut struct_attrses = vec![];
        while !input.is_empty() {
            let attrs = input.parse()?;
            let la = input.lookahead1();
            if la.peek(kw::entity) {
                let entity = input.parse::<EntityDeclaration>()?.add_attrs(attrs);
                if entity_declarations.len() > 0 {
                    return Err(Error::new(
                        entity.value.entity.span(),
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
            } else {
                return Err(la.error());
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
            entity_declaration: entity_declarations.remove(0),
            component_declarations,
            struct_attrs: struct_attrses.remove(0),
        })
    }
}
