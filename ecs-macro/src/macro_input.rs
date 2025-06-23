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
pub struct ComponentNameTablePair {
    pub name: Ident,
    pub table_name: Ident,
}

impl Parse for ComponentNameTablePair {
    fn parse(input: ParseStream) -> Result<Self> {
        let content;
        parenthesized!(content in input);
        let name = content.parse()?;
        content.parse::<Token![,]>()?;
        let table_name = content.parse()?;
        Ok(Self { name, table_name })
    }
}

#[derive(Clone)]
pub struct ComponentDeclaration {
    pub ty_name: Ident,
    pub name_table_pairs: Vec<ComponentNameTablePair>,
    pub fields: fundamental::Fields,
}

impl fundamental::AddAttrs for ComponentDeclaration {}

impl Parse for ComponentDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::component>()?;
        let ty_name = input.parse()?;
        let content;
        bracketed!(content in input);
        let name_table_pairs = content
            .parse_terminated(ComponentNameTablePair::parse, Token![,])?
            .into_iter()
            .collect();
        let fields = input.parse()?;
        Ok(Self {
            ty_name,
            name_table_pairs,
            fields,
        })
    }
}

pub struct EntityDeclaration {
    pub name: Ident,
    pub id_name: Ident,
    pub id_ty_name: Ident,
    pub tables: fundamental::Tables,
}

impl fundamental::AddAttrs for EntityDeclaration {}

impl Parse for EntityDeclaration {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::entity>()?;
        let name = input.parse()?;
        let id_name = input.parse()?;
        input.parse::<Token![:]>()?;
        let id_ty_name = input.parse()?;
        let tables = input.parse()?;
        input.parse::<Token![;]>()?;
        Ok(Self {
            name,
            id_name,
            id_ty_name,
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
        let mut entities = vec![];
        let mut components = vec![];
        let mut struct_attrses = vec![];
        while !input.is_empty() {
            let attrs = input.parse()?;
            let la = input.lookahead1();
            if la.peek(kw::entity) {
                let entity = input.parse::<EntityDeclaration>()?.add_attrs(attrs);
                if entities.len() > 0 {
                    return Err(Error::new(
                        entity.value.name.span(),
                        "Only one entity declaration is allowed.",
                    ));
                }
                entities.push(entity);
            } else if la.peek(kw::component) {
                components.push(input.parse::<ComponentDeclaration>()?.add_attrs(attrs));
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

        if entities.len() < 1 {
            return Err(Error::new(
                input.span(),
                "An entity declaration must be specified.",
            ));
        }

        struct_attrses.push(StructAttrsDeclaration.add_attrs(fundamental::Attributes(vec![])));

        Ok(EntityMacroInput {
            entity_declaration: entities.remove(0),
            component_declarations: components,
            struct_attrs: struct_attrses.remove(0),
        })
    }
}
