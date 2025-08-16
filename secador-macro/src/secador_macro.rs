use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{
    Block, Result, Stmt, Token,
    parse::{Parse, ParseStream},
};

use crate::dryer::Dryer;

pub struct SecadorMacro {
    pub stmts: Vec<Stmt>,
}

impl ToTokens for SecadorMacro {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self { stmts: statements } = self;
        tokens.extend(quote! {
          #(#statements)*
        });
    }
}

impl Parse for SecadorMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut dryer = Dryer::default().parse_args(input)?;
        input.parse::<Token![,]>()?;
        let block: Block = input.parse()?;

        Ok(Self {
            stmts: dryer.try_dry_block(block)?.stmts,
        })
    }
}
