use std::ops::Deref;

use syn::{
    Expr, Result, Token, parenthesized,
    parse::{Parse, ParseStream},
};

pub struct SubstitutionTuple(Vec<Expr>);

impl Deref for SubstitutionTuple {
    type Target = Vec<Expr>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Parse for SubstitutionTuple {
    fn parse(input: ParseStream) -> Result<Self> {
        let content;
        parenthesized!(content in input);
        let substitutions = content.parse_terminated(Expr::parse, Token![,])?;
        Ok(Self(substitutions.into_iter().collect()))
    }
}
