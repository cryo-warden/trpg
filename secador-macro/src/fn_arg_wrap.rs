use quote::ToTokens;
use syn::{
    FnArg, Pat, Result,
    parse::{Parse, ParseStream},
};

use crate::seca::{Seca, TryToSeca};

#[derive(Clone)]
pub struct FnArgWrap(pub FnArg);

impl Parse for FnArgWrap {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(input.parse()?))
    }
}

impl ToTokens for FnArgWrap {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for FnArgWrap {
    fn seca(&self, name: &str) -> Option<Seca> {
        let value = match self.0.clone() {
            FnArg::Typed(typed) => Some(typed),
            _ => None,
        }?;
        let ident = match (*value.pat).clone() {
            Pat::Ident(pat) => Some(pat.ident),
            _ => None,
        }?;
        (ident.to_string().strip_prefix("__")? == name).then_some(())?;
        let s = value.ty.to_token_stream().to_string();
        let i = s.strip_prefix("__")?;
        let count: usize = i.parse().ok()?;
        Some(Seca { count })
    }
}
