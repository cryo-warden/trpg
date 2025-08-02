extern crate proc_macro;

use quote::quote;
use syn::parse_macro_input;

use crate::secador_macro::SecadorMacro;

mod dryer;
mod field_value_wrap;
mod field_wrap;
mod fn_arg_wrap;
mod outer_attribute_wrap;
mod path_ends_with;
mod seca;
mod secador_macro;
mod substitution_tuple;
mod substitutor;
mod try_to_macro;

#[proc_macro]
pub fn secador(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let secador_macro = parse_macro_input!(input as SecadorMacro);
    proc_macro::TokenStream::from(quote!(#secador_macro))
}
