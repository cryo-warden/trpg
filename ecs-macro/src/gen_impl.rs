use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

use crate::{fundamental, gen_struct, gen_trait, macro_input};

pub struct EntityStructImpl {
    pub entity_struct: gen_struct::EntityStruct,
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub new_fn: Ident,
    pub find_fn: Ident,
}

impl EntityStructImpl {
    pub fn new(es: &gen_struct::EntityStruct, ehs: &gen_struct::EntityHandleStruct) -> Self {
        Self {
            entity_struct: es.to_owned(),
            entity_handle_struct: ehs.to_owned(),
            new_fn: format_ident!("new"),
            find_fn: format_ident!("find"),
        }
    }
}

impl ToTokens for EntityStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            new_fn, find_fn, ..
        } = self;
        let gen_struct::EntityStruct {
            entity_struct,
            tables: fundamental::Tables(tables),
            ..
        } = &self.entity_struct;
        // WIP Make entity table singular.
        let table = tables.first().unwrap();
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            id,
            id_ty,
            ..
        } = &self.entity_handle_struct;
        tokens.extend(quote! {
          impl #entity_struct {
            pub fn #new_fn(ctx: &::spacetimedb::ReducerContext) -> #entity_handle_struct {
              let entity = ::spacetimedb::Table::insert(ctx.db.#table(), Self { id: 0 });
              #entity_handle_struct {
                #id: entity.id,
                hidden: ecs::EntityHandleHidden{ ctx }
              }
            }
            pub fn #find_fn(#id: #id_ty, ctx: &::spacetimedb::ReducerContext) -> #entity_handle_struct {
              #entity_handle_struct {
                #id,
                hidden: ecs::EntityHandleHidden{ ctx }
              }
            }
          }
        });
    }
}

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

    pub fn new_vec(
        component_declarations: &Vec<fundamental::WithAttrs<macro_input::ComponentDeclaration>>,
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_structs: &Vec<gen_struct::ComponentStruct>,
        entity_handle_struct: &gen_struct::EntityHandleStruct,
    ) -> Result<Vec<Self>> {
        component_declarations
            .iter()
            .flat_map(|d| {
                d.value.component_table_pairs.iter().map(|ctp| {
                    let wcs = with_component_structs
                        .iter()
                        .find(|wcs| wcs.component == ctp.component)
                        .ok_or(Error::new(
                            ctp.component.span(),
                            "Cannot find the corresponding with-component struct.",
                        ))?;
                    let cs = component_structs
                        .iter()
                        .find(|cs| cs.component_struct == wcs.component_ty)
                        .ok_or(Error::new(
                            ctp.component.span(),
                            "Cannot find the corresponding component struct.",
                        ))?;
                    Ok(Self::new(ctp, cs, wcs, entity_handle_struct))
                })
            })
            .collect()
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

pub struct WithEntityHandleTraitForWithComponentStructImpl {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub with_entity_handle_trait: gen_trait::WithEntityHandleTrait,
}

impl WithEntityHandleTraitForWithComponentStructImpl {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        weht: &gen_trait::WithEntityHandleTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            with_entity_handle_trait: weht.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        weht: &gen_trait::WithEntityHandleTrait,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .map(|wcs| Self::new(wcs, weht))
            .collect()
    }
}

impl ToTokens for WithEntityHandleTraitForWithComponentStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait,
            entity_handle_struct,
            id_fn,
            id_ty,
            ..
        } = &self.with_entity_handle_trait;
        tokens.extend(quote! {
          impl<'a, T: #with_entity_handle_trait<'a>> #with_entity_handle_trait<'a> for #with_component_struct<T> {
              fn #id_fn(&self) -> #id_ty {
                self.to_handle().#id_fn()
              }
              fn to_handle(&self) -> &#entity_handle_struct<'a> {
                self.value.to_handle()
              }
              fn into_handle(self) -> #entity_handle_struct<'a> {
                self.value.into_handle()
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

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_traits: &Vec<gen_trait::ComponentTrait>,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Result<Vec<Self>> {
        with_component_structs
            .iter()
            .map(|wcs| {
                let ct = component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding component trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(Self::new(wcs, ct, oct))
            })
            .collect()
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

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_delete_traits: &Vec<gen_trait::ComponentDeleteTrait>,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Result<Vec<Self>> {
        with_component_structs
            .iter()
            .map(|wcs| {
                let cdt = component_delete_traits
                    .iter()
                    .find(|cdt| cdt.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding component delete trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(Self::new(wcs, cdt, oct))
            })
            .collect()
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

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_traits: &Vec<gen_trait::ComponentTrait>,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_traits
                    .iter()
                    .filter(|ct| ct.component != wcs.component)
                    .map(|ct| Self::new(wcs, ct))
            })
            .collect()
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

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_delete_traits: &Vec<gen_trait::ComponentDeleteTrait>,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_delete_traits
                    .iter()
                    .filter(|ct| ct.component != wcs.component)
                    .map(|cdt| Self::new(wcs, cdt))
            })
            .collect()
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

    pub fn new_vec(
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Vec<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                option_component_traits
                    .iter()
                    .filter(|oct| oct.component != wcs.component)
                    .map(|oct| Self::new(wcs, oct))
            })
            .collect()
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

    pub fn new_vec(
        entity_handle_struct: &gen_struct::EntityHandleStruct,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Vec<Self> {
        option_component_traits
            .iter()
            .map(|oct| Self::new(entity_handle_struct, oct))
            .collect()
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

    pub fn new_vec(
        option_component_iter_traits: &Vec<gen_trait::OptionComponentIterTrait>,
    ) -> Vec<Self> {
        option_component_iter_traits
            .iter()
            .map(|ocit| Self::new(ocit))
            .collect()
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

pub struct WithEntityHandleTraitForEntityHandleStructImpl {
    pub with_component_struct: gen_struct::EntityHandleStruct,
    pub with_entity_id_trait: gen_trait::WithEntityHandleTrait,
}

impl WithEntityHandleTraitForEntityHandleStructImpl {
    pub fn new(
        wcs: &gen_struct::EntityHandleStruct,
        weit: &gen_trait::WithEntityHandleTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            with_entity_id_trait: weit.to_owned(),
        }
    }
}

impl ToTokens for WithEntityHandleTraitForEntityHandleStructImpl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            entity_handle_struct,
            id,
            ..
        } = &self.with_component_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait: with_entity_id_trait,
            id_fn,
            id_ty,
            ..
        } = &self.with_entity_id_trait;
        tokens.extend(quote! {
          impl<'a> #with_entity_id_trait<'a> for #entity_handle_struct<'a> {
              fn #id_fn(&self) -> #id_ty { self.#id }
              fn to_handle(&self) -> &Self { self }
              fn into_handle(self) -> Self { self }
          }
        });
    }
}

pub struct EntityImpls {
    entity_struct_impl: EntityStructImpl,
    component_struct_impls: Vec<ComponentStructImpl>,
    with_entity_id_trait_for_with_component_struct_impls:
        Vec<WithEntityHandleTraitForWithComponentStructImpl>,
    replacement_component_trait_for_with_component_struct_impls:
        Vec<ReplacementComponentTraitForWithComponentStructImpl>,
    replacement_component_delete_trait_for_with_component_struct_impls:
        Vec<ReplacementComponentDeleteTraitForWithComponentStructImpl>,
    component_trait_for_with_component_struct_impls: Vec<ComponentTraitForWithComponentStructImpl>,
    component_delete_trait_for_with_component_struct_impls:
        Vec<ComponentDeleteTraitForWithComponentStructImpl>,
    option_component_trait_for_with_component_struct_impls:
        Vec<OptionComponentTraitForWithComponentStructImpl>,
    option_component_trait_for_entity_handle_struct_impls:
        Vec<OptionComponentTraitForEntityHandleStructImpl>,
    option_component_iter_trait_impls: Vec<OptionComponentIterTraitImpl>,
    with_entity_id_trait_for_entity_handle_struct_impl:
        WithEntityHandleTraitForEntityHandleStructImpl,
}

impl EntityImpls {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let macro_input::EntityMacroInput {
            component_declarations,
            ..
        } = entity_macro_input;
        let gen_struct::EntityStructs {
            entity_struct,
            component_structs,
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            component_traits,
            component_delete_traits,
            with_entity_id_trait,
            option_component_traits,
            option_component_iter_traits,
        } = entity_traits;

        let entity_struct_impl = EntityStructImpl::new(entity_struct, entity_handle_struct);

        let component_struct_impls = ComponentStructImpl::new_vec(
            component_declarations,
            with_component_structs,
            component_structs,
            entity_handle_struct,
        )?;

        let with_entity_id_trait_for_with_component_struct_impls =
            WithEntityHandleTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                with_entity_id_trait,
            );

        let replacement_component_trait_for_with_component_struct_impls =
            ReplacementComponentTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                component_traits,
                option_component_traits,
            )?;

        let replacement_component_delete_trait_for_with_component_struct_impls =
            ReplacementComponentDeleteTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                component_delete_traits,
                option_component_traits,
            )?;

        let component_trait_for_with_component_struct_impls =
            ComponentTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                component_traits,
            );

        let component_delete_trait_for_with_component_struct_impls =
            ComponentDeleteTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                component_delete_traits,
            );

        let option_component_trait_for_with_component_struct_impls =
            OptionComponentTraitForWithComponentStructImpl::new_vec(
                with_component_structs,
                option_component_traits,
            );

        let option_component_trait_for_entity_handle_struct_impls =
            OptionComponentTraitForEntityHandleStructImpl::new_vec(
                entity_handle_struct,
                option_component_traits,
            );

        let option_component_iter_trait_impls =
            OptionComponentIterTraitImpl::new_vec(option_component_iter_traits);

        let with_entity_id_trait_for_entity_handle_struct_impl =
            WithEntityHandleTraitForEntityHandleStructImpl::new(
                entity_handle_struct,
                with_entity_id_trait,
            );

        Ok(Self {
            entity_struct_impl,
            component_struct_impls,
            with_entity_id_trait_for_with_component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            replacement_component_delete_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            component_delete_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
            with_entity_id_trait_for_entity_handle_struct_impl,
        })
    }
}

impl ToTokens for EntityImpls {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            entity_struct_impl,
            component_struct_impls,
            with_entity_id_trait_for_with_component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            replacement_component_delete_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            component_delete_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
            option_component_iter_trait_impls,
            with_entity_id_trait_for_entity_handle_struct_impl,
        } = self;
        tokens.extend(quote! {
            #entity_struct_impl
            #(#component_struct_impls)*
            #(#with_entity_id_trait_for_with_component_struct_impls)*
            #(#replacement_component_trait_for_with_component_struct_impls)*
            #(#replacement_component_delete_trait_for_with_component_struct_impls)*
            #(#component_trait_for_with_component_struct_impls)*
            #(#component_delete_trait_for_with_component_struct_impls)*
            #(#option_component_trait_for_with_component_struct_impls)*
            #(#option_component_trait_for_entity_handle_struct_impls)*
            #(#option_component_iter_trait_impls)*
            #with_entity_id_trait_for_entity_handle_struct_impl
        });
    }
}
