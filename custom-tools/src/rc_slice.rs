use std::{ops::Deref, rc::Rc};

use proc_macro2::TokenStream;
use quote::ToTokens;

#[derive(Clone, Debug)]
pub struct RcSlice<T>(Rc<[T]>);

impl<T: Clone> RcSlice<T> {
    pub fn concat(&self, other: &Self) -> Self {
        let mut result = self.to_vec();
        result.extend_from_slice(&other.0);
        Self(result.into())
    }
}

impl<T> Default for RcSlice<T> {
    fn default() -> Self {
        RcSlice(Default::default())
    }
}

impl<T> Deref for RcSlice<T> {
    type Target = [T];
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> AsRef<[T]> for RcSlice<T> {
    fn as_ref(&self) -> &[T] {
        self.0.deref()
    }
}

impl<T: Clone> Into<Vec<T>> for RcSlice<T> {
    fn into(self) -> Vec<T> {
        self.0.to_vec()
    }
}

impl<T> From<Vec<T>> for RcSlice<T> {
    fn from(value: Vec<T>) -> Self {
        RcSlice(value.into())
    }
}

impl<T: Clone> IntoIterator for RcSlice<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<Self::Item>;
    fn into_iter(self) -> Self::IntoIter {
        IntoIterator::into_iter(self.0.to_vec())
    }
}

impl<'a, T: Clone> IntoIterator for &'a RcSlice<T> {
    type Item = &'a T;
    type IntoIter = std::slice::Iter<'a, T>;
    fn into_iter(self) -> Self::IntoIter {
        self.0.iter()
    }
}

impl<T: ToTokens> ToTokens for RcSlice<T> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.iter().for_each(|v| v.to_tokens(tokens));
    }
}

impl<T> FromIterator<T> for RcSlice<T> {
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {
        Self(iter.into_iter().collect())
    }
}
