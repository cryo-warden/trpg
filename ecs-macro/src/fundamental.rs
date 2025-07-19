use crate::RcSlice;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use std::ops::Deref;
use syn::{
    Attribute, Field, Ident, Result, Token, braced,
    parse::{Parse, ParseStream},
};

#[derive(Clone)]
pub struct Attributes(RcSlice<Attribute>);

impl Attributes {
    pub fn concat(&self, other: &Self) -> Self {
        Attributes(self.0.concat(&other.0))
    }
}

impl Deref for Attributes {
    type Target = RcSlice<Attribute>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Default for Attributes {
    fn default() -> Self {
        Attributes(Default::default())
    }
}

impl From<Vec<Attribute>> for Attributes {
    fn from(value: Vec<Attribute>) -> Self {
        Attributes(value.into())
    }
}

impl Parse for Attributes {
    fn parse(input: ParseStream) -> Result<Self> {
        Ok(Self(input.call(Attribute::parse_outer)?.into()))
    }
}

impl ToTokens for Attributes {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Attributes(attrs) = self;
        attrs.iter().for_each(|attr| {
            attr.to_tokens(tokens);
        });
    }
}

#[derive(Clone)]
pub struct WithAttrs<T> {
    pub attrs: Attributes,
    value: T,
}

impl<T> Deref for WithAttrs<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.value
    }
}

impl<T: Default> Default for WithAttrs<T> {
    fn default() -> Self {
        Self {
            attrs: Default::default(),
            value: T::default(),
        }
    }
}

impl<T: ToTokens> ToTokens for WithAttrs<T> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.attrs.to_tokens(tokens);
        self.value.to_tokens(tokens);
    }
}

pub trait AddAttrs: Sized {
    fn add_attrs(self, attrs: Attributes) -> WithAttrs<Self> {
        WithAttrs { attrs, value: self }
    }
}

#[derive(Clone)]
pub struct Fields(pub Vec<Field>);

impl Deref for Fields {
    type Target = Vec<Field>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

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
pub struct FieldArgs(pub Fields);

impl Deref for FieldArgs {
    type Target = Fields;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ToTokens for FieldArgs {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let field_args = self.iter().map(|Field { ident, ty, .. }| {
            quote! { #ident: #ty }
        });
        tokens.extend(quote! {
          #(#field_args,)*
        })
    }
}

#[derive(Clone)]
pub struct FieldNames(pub Fields);

impl Deref for FieldNames {
    type Target = Fields;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ToTokens for FieldNames {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let field_names = self.iter().map(|Field { ident, .. }| {
            quote! { #ident }
        });
        tokens.extend(quote! {
          #(#field_names,)*
        })
    }
}

#[derive(Clone)]
pub struct Table(pub Ident);

impl Deref for Table {
    type Target = Ident;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ToTokens for Table {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Table(table) = self;
        // TODO Make the `public` controllable.
        tokens.extend(quote! {
          #[::spacetimedb::table(name = #table, public)]
        })
    }
}

#[derive(Clone)]
pub struct Tables(pub Vec<Ident>);

impl Deref for Tables {
    type Target = Vec<Ident>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ToTokens for Tables {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Tables(tables) = self;
        let tables = tables.iter().map(|t| Table(t.to_owned()));
        tokens.extend(quote! {
          #(#tables)*
        })
    }
}
