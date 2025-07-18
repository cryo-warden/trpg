extern crate proc_macro;

use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use std::collections::HashSet;
use syn::{
    Error, Item, Result,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

mod fundamental;
mod gen_impl;
mod gen_struct;
mod gen_trait;
mod macro_input;

struct EntityMacro {
    items: Vec<fundamental::WithAttrs<Item>>,
    entity_structs: gen_struct::EntityStructs,
    entity_traits: gen_trait::EntityTraits,
    entity_impls: gen_impl::EntityImpls,
}

impl Parse for EntityMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        let entity_macro_input = input.parse()?;
        let macro_input::EntityMacroInput {
            items,
            component_declarations,
            ..
        } = &entity_macro_input;

        let mut component_set = HashSet::new();
        for cdwa in component_declarations {
            if cdwa.component_table_pairs.len() < 1 {
                return Err(Error::new(
                    cdwa.component_ty.span(),
                    "Must provide at least one component name.",
                ));
            }
            for ctp in &cdwa.component_table_pairs {
                if component_set.contains(&ctp.component) {
                    return Err(Error::new(
                        ctp.component.span(),
                        "Cannot duplicate component name.",
                    ));
                }

                component_set.insert(&ctp.component);
            }
        }

        let entity_structs = gen_struct::EntityStructs::new(&entity_macro_input);
        let entity_traits = gen_trait::EntityTraits::new(&entity_macro_input, &entity_structs)?;
        let entity_impls =
            gen_impl::EntityImpls::new(&entity_macro_input, &entity_structs, &entity_traits)?;

        Ok(Self {
            items: items.to_owned(),
            entity_structs,
            entity_traits,
            entity_impls,
        })
    }
}

impl ToTokens for EntityMacro {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            items,
            entity_structs,
            entity_traits,
            entity_impls,
        } = self;
        tokens.extend(quote! {
          #(#items)*
          #entity_structs
          #entity_traits
          #entity_impls
        });
    }
}

#[proc_macro]
pub fn entity(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let entity_macro = parse_macro_input!(input as EntityMacro);

    proc_macro::TokenStream::from(quote! { #entity_macro })
}
