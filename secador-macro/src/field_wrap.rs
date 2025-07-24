use quote::ToTokens;
use syn::{
    Field, Result,
    parse::{Parse, ParseStream},
};

use crate::seca::{Seca, TryToSeca};

#[derive(Clone)]
pub struct FieldWrap(pub Field);

impl Parse for FieldWrap {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(Field::parse_named(input)?))
    }
}

impl ToTokens for FieldWrap {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for FieldWrap {
    fn seca(&self) -> Option<Seca> {
        let ident = self.0.ident.clone()?;
        (ident.to_string() == "__seca").then_some(())?;
        let s = self.0.ty.to_token_stream().to_string();
        let i = s.strip_prefix("__")?;
        let count: usize = i.parse().ok()?;
        Some(Seca { count })
    }
}
