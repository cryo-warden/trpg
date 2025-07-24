use quote::ToTokens;
use syn::{
    Field, Result,
    parse::{Parse, ParseStream},
    punctuated::Pair,
    token::Comma,
};

use crate::seca::{Seca, TryToSeca};

type FieldPair = Pair<Field, Comma>;
#[derive(Clone)]
pub struct FieldWrap(pub FieldPair);

impl Parse for FieldWrap {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(FieldPair::Punctuated(
            Field::parse_named(input)?,
            input.parse()?,
        )))
    }
}

impl ToTokens for FieldWrap {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for FieldWrap {
    fn seca(&self) -> Option<Seca> {
        let value = self.0.value();
        let ident = value.ident.clone()?;
        (ident.to_string() == "__seca").then_some(())?;
        let s = value.ty.to_token_stream().to_string();
        let i = s.strip_prefix("__")?;
        let count: usize = i.parse().ok()?;
        Some(Seca { count })
    }
}
