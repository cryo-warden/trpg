use quote::ToTokens;
use syn::{
    FieldValue, Member, Result,
    parse::{Parse, ParseStream},
};

use crate::seca::{Seca, TryToSeca};

#[derive(Clone)]
pub struct FieldValueWrap(pub FieldValue);

impl Parse for FieldValueWrap {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(input.parse()?))
    }
}

impl ToTokens for FieldValueWrap {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for FieldValueWrap {
    fn seca(&self, name: &str) -> Option<Seca> {
        let ident = match self.0.member.clone() {
            Member::Named(ident) => Some(ident),
            _ => None,
        }?;
        (ident.to_string().strip_prefix("__")? == name).then_some(())?;
        let s = self.0.expr.to_token_stream().to_string();
        let i = s.strip_prefix("__")?;
        let count: usize = i.parse().ok()?;
        Some(Seca { count })
    }
}
