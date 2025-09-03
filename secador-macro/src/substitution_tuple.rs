use std::ops::Deref;

use quote::ToTokens;
use syn::{
    Expr, Result, Token, Type, bracketed, parenthesized,
    parse::{Parse, ParseStream},
};

mod kw {
    syn::custom_keyword!(Type);
}

struct ExplicitTypeMacro;

impl Parse for ExplicitTypeMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::Type>()?;
        input.parse::<Token![!]>()?;
        Ok(ExplicitTypeMacro)
    }
}

struct ExplicitType(Type);

impl Parse for ExplicitType {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<ExplicitTypeMacro>()?;

        let content;
        bracketed!(content in input);
        Ok(Self(content.parse()?))
    }
}

pub enum Substitution {
    Expr(Expr),
    Type(Type),
}

impl Parse for Substitution {
    fn parse(input: ParseStream) -> Result<Self> {
        if let Ok(_) = input.fork().parse::<ExplicitTypeMacro>() {
            Ok(Substitution::Type(input.parse::<ExplicitType>()?.0))
        } else if let Ok(_) = input.fork().parse::<Expr>() {
            Ok(Substitution::Expr(input.parse()?))
        } else {
            Ok(Substitution::Type(input.parse()?))
        }
    }
}

impl ToTokens for Substitution {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        match self {
            Substitution::Expr(expr) => expr.to_tokens(tokens),
            Substitution::Type(ty) => ty.to_tokens(tokens),
        }
    }
}

pub struct SubstitutionTuple(Vec<Substitution>);

impl Deref for SubstitutionTuple {
    type Target = Vec<Substitution>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Parse for SubstitutionTuple {
    fn parse(input: ParseStream) -> Result<Self> {
        let content;
        parenthesized!(content in input);
        let substitutions = content.parse_terminated(Substitution::parse, Token![,])?;
        Ok(Self(substitutions.into_iter().collect()))
    }
}
