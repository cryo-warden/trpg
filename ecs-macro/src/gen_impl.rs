use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

use crate::{gen_struct, gen_trait, macro_input};

pub struct ComponentStructImpl {
    pub component_struct: gen_struct::ComponentStruct,
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub table_name: Ident,
    pub iter_fn_name: Ident,
    pub into_handle_fn_name: Ident,
}

impl ComponentStructImpl {
    pub fn new(
        ntp: &macro_input::ComponentNameTablePair,
        cs: &gen_struct::ComponentStruct,
        wcs: &gen_struct::WithComponentStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            component_struct: cs.to_owned(),
            with_component_struct: wcs.to_owned(),
            entity_handle_struct: ehs.to_owned(),
            table_name: ntp.table_name.to_owned(),
            iter_fn_name: format_ident!("iter_{}", ntp.name),
            into_handle_fn_name: format_ident!("into_{}_handle", ntp.name),
        }
    }
}

impl ToTokens for ComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            table_name,
            iter_fn_name,
            into_handle_fn_name,
            ..
        } = self;
        let gen_struct::ComponentStruct {
            ref struct_name, ..
        } = self.component_struct;
        let gen_struct::WithComponentStruct {
            struct_name: ref with_component_struct_name,
            ref component_name,
            ..
        } = self.with_component_struct;
        let gen_struct::EntityHandleStruct {
            struct_name: ref entity_handle_struct,
            ..
        } = self.entity_handle_struct;
        tokens.extend(quote! {
          impl #struct_name {
            pub fn #into_handle_fn_name(self, ctx: &spacetimedb::ReducerContext) -> #with_component_struct_name<#entity_handle_struct> {
              let entity_id = self.entity_id;
              #with_component_struct_name {
                #component_name: self,
                value: #entity_handle_struct { entity_id, hidden: ecs::EntityHandleHidden { ctx } },
              }
            }
            pub fn #iter_fn_name(ctx: &spacetimedb::ReducerContext) -> impl Iterator<Item = #with_component_struct_name<#entity_handle_struct>> {
              spacetimedb::Table::iter(ctx.db.#table_name()).map(|c| c.#into_handle_fn_name(ctx))
            }
          }
        });
    }
}

pub struct ReplacementComponentTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_trait: gen_trait::ComponentTrait,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl ReplacementComponentTraitForWithComponentStructImpl {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        ct: &gen_trait::ComponentTrait,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_trait: ct.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }
}

impl ToTokens for ReplacementComponentTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            ref struct_name,
            ref component_name,
            ..
        } = self.with_component_struct;
        let gen_trait::ComponentTrait {
            ref trait_name,
            ref component_ty_name,
            ref mut_getter_fn_name,
            ref getter_fn_name,
            ref update_fn_name,
            ref delete_fn_name,
            ..
        } = self.component_trait;
        let gen_trait::OptionComponentTrait {
            trait_name: ref option_trait_name,
            update_fn_name: ref option_update_fn_name,
            delete_fn_name: ref option_delete_fn_name,
            ..
        } = self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_trait_name> #trait_name for #struct_name<T> {
            fn #mut_getter_fn_name(&mut self) -> &mut #component_ty_name {
              &mut self.#component_name
            }
            fn #getter_fn_name(&self) -> &#component_ty_name {
              &self.#component_name
            }
            fn #update_fn_name(mut self) -> Self {
              self.#component_name = self.value.#option_update_fn_name(self.#component_name);
              self
            }
            fn #delete_fn_name(mut self) {
              self.value.#option_delete_fn_name();
            }
          }
        });
    }
}

pub struct ComponentTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_trait: gen_trait::ComponentTrait,
}

impl ComponentTraitForWithComponentStructImpl {
    pub fn new(wcs: &gen_struct::WithComponentStruct, ct: &gen_trait::ComponentTrait) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_trait: ct.to_owned(),
        }
    }
}

impl ToTokens for ComponentTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            ref struct_name, ..
        } = self.with_component_struct;
        let gen_trait::ComponentTrait {
            ref trait_name,
            ref component_ty_name,
            ref mut_getter_fn_name,
            ref getter_fn_name,
            ref update_fn_name,
            ref delete_fn_name,
            ..
        } = self.component_trait;
        tokens.extend(quote! {
          impl<T: #trait_name> #trait_name for #struct_name<T> {
            fn #mut_getter_fn_name(&mut self) -> &mut #component_ty_name {
              self.value.#mut_getter_fn_name()
            }
            fn #getter_fn_name(&self) -> &#component_ty_name {
              self.value.#getter_fn_name()
            }
            fn #update_fn_name(mut self) -> Self {
              self.value = self.value.#update_fn_name();
              self
            }
            fn #delete_fn_name(mut self) {
              self.value.#delete_fn_name();
            }
          }
        });
    }
}

pub struct OptionComponentTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl OptionComponentTraitForWithComponentStructImpl {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            ref struct_name, ..
        } = self.with_component_struct;
        let gen_trait::OptionComponentTrait {
            ref trait_name,
            ref component_ty_name,
            ref getter_fn_name,
            ref update_fn_name,
            ref delete_fn_name,
            ..
        } = self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #trait_name> #trait_name for #struct_name<T> {
            fn #getter_fn_name(&self) -> ::core::option::Option<#component_ty_name> {
              self.value.#getter_fn_name()
            }
            fn #update_fn_name(&self, value: #component_ty_name) -> #component_ty_name {
              self.value.#update_fn_name(value)
            }
            fn #delete_fn_name(&self) {
              self.value.#delete_fn_name()
            }
          }
        });
    }
}

pub struct OptionComponentTraitForEntityHandleStructImpl {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub option_component_trait: gen_trait::OptionComponentTrait,
    pub table_name: Ident,
}

impl OptionComponentTraitForEntityHandleStructImpl {
    pub fn new(
        ehs: &gen_struct::EntityHandleStruct,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            entity_handle_struct: ehs.to_owned(),
            option_component_trait: oct.to_owned(),
            table_name: oct.table_name.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentTraitForEntityHandleStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            ref id_name,
            ref struct_name,
            ..
        } = self.entity_handle_struct;
        let gen_trait::OptionComponentTrait {
            ref trait_name,
            ref component_ty_name,
            ref getter_fn_name,
            ref update_fn_name,
            ref delete_fn_name,
            ..
        } = self.option_component_trait;
        let table_name = &self.table_name;
        tokens.extend(quote! {
          impl<'a> #trait_name for #struct_name<'a> {
            fn #getter_fn_name(&self) -> ::core::option::Option<#component_ty_name> {
              self.hidden.ctx.db.#table_name().#id_name().find(self.#id_name)
            }
            fn #update_fn_name(&self, value: #component_ty_name) -> #component_ty_name {
              self.hidden.ctx.db.#table_name().#id_name().update(value)
            }
            fn #delete_fn_name(&self) {
              self.hidden.ctx.db.#table_name().#id_name().delete(self.#id_name);
            }
          }
        });
    }
}

pub struct OptionComponentIterTraitImpl {
    pub trait_name: Ident,
    pub option_trait_name: Ident,
}

impl OptionComponentIterTraitImpl {
    pub fn new(ocit: &gen_trait::OptionComponentIterTrait) -> Self {
        Self {
            trait_name: ocit.trait_name.to_owned(),
            option_trait_name: ocit.option_trait_name.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentIterTraitImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            trait_name,
            option_trait_name,
        } = self;
        tokens.extend(quote! {
          impl<T: #option_trait_name, U: Iterator<Item = T>> #trait_name<T> for U {}
        });
    }
}
