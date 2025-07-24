use quote::ToTokens;
use syn::{
    FieldValue, Member, Result,
    parse::{Parse, ParseStream},
    punctuated::Pair,
    token::Comma,
};

use crate::seca::{Seca, TryToSeca};

type FieldValuePair = Pair<FieldValue, Comma>;
#[derive(Clone)]
pub struct FieldValueWrap(pub FieldValuePair);

impl Parse for FieldValueWrap {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(FieldValuePair::Punctuated(
            input.parse()?,
            input.parse()?,
        )))
    }
}

impl ToTokens for FieldValueWrap {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for FieldValueWrap {
    fn seca(&self) -> Option<Seca> {
        let value = self.0.value();
        let ident = match value.member.clone() {
            Member::Named(ident) => Some(ident),
            _ => None,
        }?;
        (ident.to_string() == "__seca").then_some(())?;
        let s = value.expr.to_token_stream().to_string();
        let i = s.strip_prefix("__")?;
        let count: usize = i.parse().ok()?;
        Some(Seca { count })
    }
}
