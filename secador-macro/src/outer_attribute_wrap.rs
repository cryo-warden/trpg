use proc_macro2::TokenStream;
use quote::ToTokens;
use syn::{Attribute, Error, LitInt, Result, parse::Parse};

use crate::seca::{Seca, TryToSeca};

struct SecaAttributeArgs {
    count: usize,
}

impl Parse for SecaAttributeArgs {
    fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
        let count: LitInt = input.parse()?;
        let count: usize = count.base10_parse()?;
        Ok(SecaAttributeArgs { count })
    }
}

#[derive(Clone)]
pub struct OuterAttributeWrap(pub Attribute);

impl Parse for OuterAttributeWrap {
    fn parse(input: syn::parse::ParseStream) -> Result<Self> {
        let attr = Attribute::parse_outer(input)?
            .first()
            .ok_or(Error::new(input.span(), "Expected at least one attribute."))?
            .to_owned();
        Ok(OuterAttributeWrap(attr))
    }
}

impl ToTokens for OuterAttributeWrap {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.0.to_tokens(tokens);
    }
}

impl TryToSeca for OuterAttributeWrap {
    fn seca(&self) -> Option<Seca> {
        let path_end = self.0.path().segments.last()?.ident.to_string();
        if path_end != "seca" {
            return None;
        }
        let SecaAttributeArgs { count } = self.0.parse_args().ok()?;
        Some(Seca { count })
    }
}
