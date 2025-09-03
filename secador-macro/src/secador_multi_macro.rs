use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{
    Block, Ident, Result, Stmt, Token,
    parse::{Parse, ParseStream},
};

use crate::dryer::Dryer;

pub struct SecadorMultiMacro {
    pub stmts: Vec<Stmt>,
}

impl ToTokens for SecadorMultiMacro {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self { stmts } = self;
        tokens.extend(quote! {
          #(#stmts)*
        });
    }
}

impl Parse for SecadorMultiMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut dryers: Vec<Dryer> = vec![];
        while input.peek(Ident) {
            dryers.push(input.parse()?);
            input.parse::<Token![,]>()?;
        }

        let mut block: Block = input.parse()?;

        for mut dryer in dryers {
            block = dryer.try_dry_block(block)?;
        }

        Ok(Self { stmts: block.stmts })
    }
}
