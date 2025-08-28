use crate::{fundamental, gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct ComponentMod {
    module: Ident,
    aliases: Vec<(Ident, Ident)>,
}

impl ComponentMod {
    fn make_alias(trait_ident: &Ident, component: &Ident) -> Option<Ident> {
        let prefix = format!("__{}__", component.to_string());
        trait_ident
            .to_string()
            .strip_prefix(&prefix)
            .map(|s| format_ident!("{}", s))
    }

    pub fn new(
        component: &Ident,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Option<Self> {
        let mut aliases: Vec<(Ident, Ident)> = Vec::new();

        for wcs in entity_structs.with_component_structs.iter() {
            if wcs.component == *component {
                let full = wcs.with_component_struct.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for ct in entity_traits.component_traits.iter() {
            if ct.component == *component {
                let full = ct.component_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for og in entity_traits.option_get_component_traits.iter() {
            if og.component == *component {
                let full = og.option_get_component_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for ow in entity_traits.option_with_component_traits.iter() {
            if ow.with_component_struct == *component
                || ow
                    .option_with_component_trait
                    .to_string()
                    .contains(&format!("__{}__", component))
            {
                let full = ow.option_with_component_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for oc in entity_traits.option_component_traits.iter() {
            if oc.component == *component {
                let full = oc.option_component_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for it in entity_traits.iter_component_traits.iter() {
            if it.component == *component {
                let full = it.iter_component_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for ocit in entity_traits.option_component_iter_traits.iter() {
            if ocit
                .option_with_component_trait
                .to_string()
                .contains(&format!("__{}__", component))
            {
                let full = ocit.option_component_iter_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for ic in entity_traits.into_component_handle_traits.iter() {
            if ic
                .into_component_handle_trait
                .to_string()
                .contains(&format!("__{}__", component))
            {
                let full = ic.into_component_handle_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        for cdt in entity_traits.component_delete_traits.iter() {
            if cdt.component == *component {
                let full = cdt.component_delete_trait.to_owned();
                let alias = Self::make_alias(&full, component)?;
                aliases.push((full, alias));
            }
        }

        Some(Self {
            module: format_ident!("{}_component", component),
            aliases,
        })
    }

    pub fn new_vec(
        cds: &RcSlice<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> RcSlice<Self> {
        cds.iter()
            .flat_map(|cd| {
                cd.component_table_pairs
                    .iter()
                    .flat_map(|ctp| Self::new(&ctp.component, entity_structs, entity_traits))
            })
            .collect()
    }
}

impl ToTokens for ComponentMod {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let component = &self.module;
        let uses = self.aliases.iter().map(|(full, alias)| {
            quote! { pub use super::#full as #alias; }
        });

        tokens.extend(quote! {
          pub mod #component {
            #(#uses)*
          }
        });
    }
}
