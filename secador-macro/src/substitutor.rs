use proc_macro2::{Group, TokenStream, TokenTree};
use quote::{ToTokens, quote};
use syn::{Error, Result, parse::Parse, parse2, spanned::Spanned};

use crate::substitution_tuple::SubstitutionTuple;

pub struct Substitutor<'a> {
    pub names: &'a Vec<String>,
    pub substitutions: &'a SubstitutionTuple,
}

impl<'a> Substitutor<'a> {
    pub fn replace_identifiers(&self, ts: TokenStream) -> Result<TokenStream> {
        ts.into_iter()
            .map(|t| {
                Ok(match t {
                    TokenTree::Ident(ident) => {
                        if let Some(ident) = ident.to_string().strip_prefix("__") {
                            let expr = self
                                .names
                                .iter()
                                .position(|n| ident == n)
                                .and_then(|i| self.substitutions.get(i))
                                .ok_or(Error::new(
                                    ident.span(),
                                    format!("Identifier '{}' not found in names", ident),
                                ))?;
                            quote!(#expr)
                        } else {
                            ident.to_token_stream()
                        }
                    }
                    TokenTree::Group(g) => {
                        Group::new(g.delimiter(), self.replace_identifiers(g.stream())?)
                            .to_token_stream()
                    }
                    t => t.into_token_stream(),
                })
            })
            .collect()
    }

    pub fn substitute<T>(&self, t: T) -> Result<T>
    where
        T: Parse + ToTokens,
    {
        parse2(self.replace_identifiers(quote!(#t))?)
    }
}
