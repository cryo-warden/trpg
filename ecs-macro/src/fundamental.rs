use crate::kw;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{
    Attribute, Field, Ident, Result, Token, braced, parenthesized,
    parse::{Parse, ParseStream},
};

#[derive(Clone)]
pub struct Attributes(pub Vec<Attribute>);

impl Attributes {
    pub fn to_joined(&self, other: &Self) -> Self {
        let mut new_attrs = self.0.to_owned();
        new_attrs.extend(other.0.to_owned().into_iter());
        Self(new_attrs)
    }
}

impl Parse for Attributes {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(input.call(Attribute::parse_outer)?))
    }
}

impl ToTokens for Attributes {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Attributes(attrs) = self;
        tokens.extend(quote! {
          #(#attrs)*
        });
    }
}

pub struct WithAttrs<T> {
    pub attrs: Attributes,
    pub value: T,
}

pub trait AddAttrs: Sized {
    fn add_attrs(self, attrs: Attributes) -> WithAttrs<Self> {
        WithAttrs { attrs, value: self }
    }
}

#[derive(Clone)]
pub struct Fields(Vec<Field>);

impl Parse for Fields {
    fn parse(input: ParseStream) -> Result<Self> {
        let content;
        braced!(content in input);
        let fields = content
            .parse_terminated(Field::parse_named, Token![,])?
            .into_iter()
            .collect();
        Ok(Fields(fields))
    }
}

impl ToTokens for Fields {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Fields(fields) = self;
        tokens.extend(quote! {
          #(#fields,)*
        })
    }
}

#[derive(Clone)]
pub struct Tables(pub Vec<Ident>);

impl Parse for Tables {
    fn parse(input: ParseStream) -> Result<Self> {
        input.parse::<kw::tables>()?;
        let content;
        parenthesized!(content in input);
        let tables = content
            .parse_terminated(Ident::parse, Token![,])?
            .into_iter()
            .collect();
        Ok(Tables(tables))
    }
}

impl ToTokens for Tables {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Tables(tables) = self;
        // TODO Make the `public` controllable in the macro.
        tokens.extend(quote! {
          #( #[spacetimedb::table(name = #tables, public)] )*
        })
    }
}
