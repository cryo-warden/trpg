use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

use crate::{gen_struct, gen_trait, macro_input};

pub struct ComponentStructImpl {
    pub component_struct: gen_struct::ComponentStruct,
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub table: Ident,
    pub iter_fn: Ident,
    pub into_handle_fn: Ident,
}

impl ComponentStructImpl {
    pub fn new(
        ctp: &macro_input::ComponentTablePair,
        cs: &gen_struct::ComponentStruct,
        wcs: &gen_struct::WithComponentStruct,
        ehs: &gen_struct::EntityHandleStruct,
    ) -> Self {
        Self {
            component_struct: cs.to_owned(),
            with_component_struct: wcs.to_owned(),
            entity_handle_struct: ehs.to_owned(),
            table: ctp.table.to_owned(),
            iter_fn: format_ident!("iter_{}", ctp.component),
            into_handle_fn: format_ident!("into_{}_handle", ctp.component),
        }
    }
}

impl ToTokens for ComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            table,
            iter_fn,
            into_handle_fn,
            ..
        } = self;
        let gen_struct::ComponentStruct {
            component_struct, ..
        } = &self.component_struct;
        let gen_struct::WithComponentStruct {
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        tokens.extend(quote! {
          impl #component_struct {
            pub fn #into_handle_fn(self, ctx: &::spacetimedb::ReducerContext) -> #with_component_struct<#entity_handle_struct> {
              let entity_id = self.entity_id;
              #with_component_struct {
                #component: self,
                value: #entity_handle_struct { entity_id, hidden: ecs::EntityHandleHidden { ctx } },
              }
            }
            pub fn #iter_fn(ctx: &::spacetimedb::ReducerContext) -> impl Iterator<Item = #with_component_struct<#entity_handle_struct>> {
              ::spacetimedb::Table::iter(ctx.db.#table()).map(|c| c.#into_handle_fn(ctx))
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
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentTrait {
            component_trait,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = &self.component_trait;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            update_fn: option_update_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #component_trait for #with_component_struct<T> {
            fn #mut_getter_fn(&mut self) -> &mut #component_ty {
              &mut self.#component
            }
            fn #getter_fn(&self) -> &#component_ty {
              &self.#component
            }
            fn #update_fn(mut self) -> Self {
              self.#component = self.value.#option_update_fn(self.#component);
              self
            }
          }
        });
    }
}

pub struct ReplacementComponentDeleteTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_delete_trait: gen_trait::ComponentDeleteTrait,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl ReplacementComponentDeleteTraitForWithComponentStructImpl {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        cdt: &gen_trait::ComponentDeleteTrait,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_delete_trait: cdt.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }
}

impl ToTokens for ReplacementComponentDeleteTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentDeleteTrait {
            component_delete_trait,
            delete_fn,
            ..
        } = &self.component_delete_trait;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            delete_fn: option_delete_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #component_delete_trait<T> for #with_component_struct<T> {
            fn #delete_fn(mut self) -> T {
              self.value.#option_delete_fn();
              self.value
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
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentTrait {
            component_trait,
            component_ty,
            mut_getter_fn,
            getter_fn,
            update_fn,
            ..
        } = &self.component_trait;
        tokens.extend(quote! {
          impl<T: #component_trait> #component_trait for #with_component_struct<T> {
            fn #mut_getter_fn(&mut self) -> &mut #component_ty {
              self.value.#mut_getter_fn()
            }
            fn #getter_fn(&self) -> &#component_ty {
              self.value.#getter_fn()
            }
            fn #update_fn(mut self) -> Self {
              self.value = self.value.#update_fn();
              self
            }
          }
        });
    }
}

pub struct ComponentDeleteTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_delete_trait: gen_trait::ComponentDeleteTrait,
}

impl ComponentDeleteTraitForWithComponentStructImpl {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        cdt: &gen_trait::ComponentDeleteTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_delete_trait: cdt.to_owned(),
        }
    }
}

impl ToTokens for ComponentDeleteTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentDeleteTrait {
            component_delete_trait,
            delete_fn,
            ..
        } = &self.component_delete_trait;
        tokens.extend(quote! {
        impl<T: #component_delete_trait<U>, U: Sized> #component_delete_trait<#with_component_struct<U>> for #with_component_struct<T> {
          fn #delete_fn(mut self) -> #with_component_struct<U> {
            #with_component_struct::<U> {
              #component: self.#component,
              value: self.value.#delete_fn(),
            }
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
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            component,
            component_ty,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #option_component_trait for #with_component_struct<T> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              self.value.#getter_fn()
            }
            fn #insert_fn(&self, #component: #component_ty) -> #component_ty {
              self.value.#insert_fn(#component)
            }
            fn #update_fn(&self, #component: #component_ty) -> #component_ty {
              self.value.#update_fn(#component)
            }
            fn #delete_fn(&self) {
              self.value.#delete_fn();
            }
          }
        });
    }
}

pub struct OptionComponentTraitForEntityHandleStructImpl {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl OptionComponentTraitForEntityHandleStructImpl {
    pub fn new(
        ehs: &gen_struct::EntityHandleStruct,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            entity_handle_struct: ehs.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentTraitForEntityHandleStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            id,
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            component,
            component_ty,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
            table,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<'a> #option_component_trait for #entity_handle_struct<'a> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              ::spacetimedb::UniqueColumn::find(&self.hidden.ctx.db.#table().#id(), self.#id)
            }
            fn #insert_fn(&self, #component: #component_ty) -> #component_ty {
              ::spacetimedb::Table::insert(self.hidden.ctx.db.#table(), #component)
            }
            fn #update_fn(&self, #component: #component_ty) -> #component_ty {
              ::spacetimedb::UniqueColumn::update(&self.hidden.ctx.db.#table().#id(), #component)
            }
            fn #delete_fn(&self) {
              ::spacetimedb::UniqueColumn::delete(&self.hidden.ctx.db.#table().#id(), self.#id);
            }
          }
        });
    }
}

pub struct OptionComponentIterTraitImpl {
    pub option_component_iter_trait: Ident,
    pub option_component_trait: Ident,
}

impl OptionComponentIterTraitImpl {
    pub fn new(ocit: &gen_trait::OptionComponentIterTrait) -> Self {
        Self {
            option_component_iter_trait: ocit.option_component_iter_trait.to_owned(),
            option_component_trait: ocit.option_component_trait.to_owned(),
        }
    }
}

impl ToTokens for OptionComponentIterTraitImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_component_trait,
        } = self;
        tokens.extend(quote! {
          impl<T: #option_component_trait, U: Iterator<Item = T>> #option_component_iter_trait<T> for U {}
        });
    }
}
