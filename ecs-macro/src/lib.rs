extern crate proc_macro;

use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use std::collections::HashSet;
use syn::{
    Error, Result,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

mod fundamental;
mod gen_impl;
mod gen_struct;
mod gen_trait;
mod kw;
mod macro_input;

struct EntityMacro {
    entity_struct: gen_struct::EntityStruct,
    component_structs: Vec<gen_struct::ComponentStruct>,
    entity_handle_struct: gen_struct::EntityHandleStruct,
    with_component_structs: Vec<gen_struct::WithComponentStruct>,

    component_traits: Vec<gen_trait::ComponentTrait>,
    option_component_traits: Vec<gen_trait::OptionComponentTrait>,
    option_component_iter_traits: Vec<gen_trait::OptionComponentIterTrait>,

    component_struct_impls: Vec<gen_impl::ComponentStructImpl>,
    replacement_component_trait_for_with_component_struct_impls:
        Vec<gen_impl::ReplacementComponentTraitForWithComponentStructImpl>,
    component_trait_for_with_component_struct_impls:
        Vec<gen_impl::ComponentTraitForWithComponentStructImpl>,
    option_component_trait_for_with_component_struct_impls:
        Vec<gen_impl::OptionComponentTraitForWithComponentStructImpl>,
    option_component_trait_for_entity_handle_struct_impls:
        Vec<gen_impl::OptionComponentTraitForEntityHandleStructImpl>,
    option_component_iter_trait_impls: Vec<gen_impl::OptionComponentIterTraitImpl>,
}

impl Parse for EntityMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        let macro_input::EntityMacroInput {
            entity_declaration,
            component_declarations,
            struct_attrs,
        } = input.parse()?;

        let mut component_name_set = HashSet::new();
        for d in &component_declarations {
            if d.value.name_table_pairs.len() < 1 {
                return Err(Error::new(
                    d.value.ty_name.span(),
                    "Must provide at least one component name.",
                ));
            }
            for ntp in &d.value.name_table_pairs {
                if component_name_set.contains(&ntp.name) {
                    return Err(Error::new(
                        ntp.name.span(),
                        "Cannot duplicate component name.",
                    ));
                }

                component_name_set.insert(&ntp.name);
            }
        }

        let entity_struct = gen_struct::EntityStruct::new(&struct_attrs, &entity_declaration);
        let component_structs = component_declarations
            .iter()
            .map(|d| gen_struct::ComponentStruct::new(&struct_attrs, d, &entity_declaration))
            .collect::<Vec<_>>();
        let entity_handle_struct =
            gen_struct::EntityHandleStruct::new(&struct_attrs, &entity_declaration);
        let with_component_structs = component_declarations
            .iter()
            .flat_map(|d| {
                d.value
                    .name_table_pairs
                    .iter()
                    .map(|ntp| gen_struct::WithComponentStruct::new(&struct_attrs, ntp, d))
            })
            .collect::<Vec<_>>();

        let component_traits = component_declarations
            .iter()
            .flat_map(|d| {
                d.value
                    .name_table_pairs
                    .iter()
                    .map(|ntp| gen_trait::ComponentTrait::new(ntp, &d.value))
            })
            .collect::<Vec<_>>();
        let option_component_traits = component_declarations
            .iter()
            .flat_map(|d| {
                d.value.name_table_pairs.iter().map(|ntp| {
                    let wcs = with_component_structs
                        .iter()
                        .find(|wcs| wcs.component_name == ntp.name)
                        .ok_or(Error::new(
                            ntp.name.span(),
                            "Cannot find the corresponding with-component struct.",
                        ))?;
                    Ok(gen_trait::OptionComponentTrait::new(ntp, &d.value, wcs))
                })
            })
            .collect::<Result<Vec<_>>>()?;
        let option_component_iter_traits = option_component_traits
            .iter()
            .map(|oct| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| wcs.component_name == oct.component_name)
                    .ok_or(Error::new(
                        oct.component_name.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(gen_trait::OptionComponentIterTrait::new(oct, wcs))
            })
            .collect::<Result<Vec<_>>>()?;

        let component_struct_impls = component_declarations
            .iter()
            .flat_map(|d| {
                d.value.name_table_pairs.iter().map(|ntp| {
                    let wcs = with_component_structs
                        .iter()
                        .find(|wcs| wcs.component_name == ntp.name)
                        .ok_or(Error::new(
                            ntp.name.span(),
                            "Cannot find the corresponding with-component struct.",
                        ))?;
                    let cs = component_structs
                        .iter()
                        .find(|cs| cs.struct_name == wcs.component_ty_name)
                        .ok_or(Error::new(
                            ntp.name.span(),
                            "Cannot find the corresponding component struct.",
                        ))?;
                    Ok(gen_impl::ComponentStructImpl::new(
                        ntp,
                        cs,
                        wcs,
                        &entity_handle_struct,
                    ))
                })
            })
            .collect::<Result<Vec<_>>>()?;

        let replacement_component_trait_for_with_component_struct_impls = with_component_structs
            .iter()
            .map(|wcs| {
                let ct = component_traits
                    .iter()
                    .find(|ct| ct.component_name == wcs.component_name)
                    .ok_or(Error::new(
                        wcs.component_name.span(),
                        "Cannot find the corresponding component trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component_name == wcs.component_name)
                    .ok_or(Error::new(
                        wcs.component_name.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(
                    gen_impl::ReplacementComponentTraitForWithComponentStructImpl::new(
                        wcs, ct, oct,
                    ),
                )
            })
            .collect::<Result<Vec<_>>>()?;

        let component_trait_for_with_component_struct_impls = with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_traits
                    .iter()
                    .filter(|ct| ct.component_name != wcs.component_name)
                    .map(|ct| gen_impl::ComponentTraitForWithComponentStructImpl::new(wcs, ct))
            })
            .collect::<Vec<_>>();

        let option_component_trait_for_with_component_struct_impls = with_component_structs
            .iter()
            .flat_map(|wcs| {
                option_component_traits
                    .iter()
                    .filter(|oct| oct.component_name != wcs.component_name)
                    .map(|oct| {
                        gen_impl::OptionComponentTraitForWithComponentStructImpl::new(wcs, oct)
                    })
            })
            .collect::<Vec<_>>();

        let option_component_trait_for_entity_handle_struct_impls = option_component_traits
            .iter()
            .map(|oct| {
                gen_impl::OptionComponentTraitForEntityHandleStructImpl::new(
                    &entity_handle_struct,
                    oct,
                )
            })
            .collect::<Vec<_>>();

        let option_component_iter_trait_impls = option_component_iter_traits
            .iter()
            .map(|ocit| gen_impl::OptionComponentIterTraitImpl::new(ocit))
            .collect();

        Ok(Self {
            entity_struct,
            component_structs,
            entity_handle_struct,
            with_component_structs,

            component_traits,
            option_component_traits,
            option_component_iter_traits,

            component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
        })
    }
}

impl ToTokens for EntityMacro {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let EntityMacro {
            entity_struct,
            component_structs,
            entity_handle_struct,
            with_component_structs,

            component_traits,
            option_component_traits,
            option_component_iter_traits,

            component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
        } = self;
        tokens.extend(quote! {
          #entity_struct
          #(#component_structs)*
          #entity_handle_struct
          #(#with_component_structs)*

          #(#component_traits)*
          #(#option_component_traits)*
          #(#option_component_iter_traits)*

          #(#component_struct_impls)*
          #(#replacement_component_trait_for_with_component_struct_impls)*
          #(#component_trait_for_with_component_struct_impls)*
          #(#option_component_trait_for_with_component_struct_impls)*
          #(#option_component_trait_for_entity_handle_struct_impls)*
          #(#option_component_iter_trait_impls)*
        });
    }
}

#[proc_macro]
pub fn entity(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let entity_macro = parse_macro_input!(input as EntityMacro);

    proc_macro::TokenStream::from(quote! { #entity_macro })
}
