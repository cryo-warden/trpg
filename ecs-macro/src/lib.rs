extern crate proc_macro;

use std::collections::HashSet;

use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{
    Attribute, Error, Field, Ident, Result, Token, braced, parenthesized,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

mod kw {
    use syn::custom_keyword;

    custom_keyword!(struct_attrs);
    custom_keyword!(component);
    custom_keyword!(entity);
    custom_keyword!(tables);
}

#[derive(Clone)]
struct Attributes(Vec<Attribute>);

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

struct WithAttrs<T> {
    pub attrs: Attributes,
    pub value: T,
}

trait AddAttrs: Sized {
    fn add_attrs(self, attrs: Attributes) -> WithAttrs<Self> {
        WithAttrs { attrs, value: self }
    }
}

#[derive(Clone)]
struct Fields(Vec<Field>);

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
struct Tables(Vec<Ident>);

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
        tokens.extend(quote! {
          #( #[spacetimedb::table(name = #tables)] )*
        })
    }
}

mod macro_input {
    use syn::{
        Error, Ident, Result, Token, bracketed, parenthesized,
        parse::{Parse, ParseStream},
        spanned::Spanned,
    };

    use crate::{AddAttrs, Attributes, Fields, Tables, WithAttrs, kw};

    #[derive(Clone)]
    pub struct StructAttrsDeclaration;

    impl AddAttrs for StructAttrsDeclaration {}

    impl Parse for StructAttrsDeclaration {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::struct_attrs>()?;
            Ok(StructAttrsDeclaration)
        }
    }

    #[derive(Clone)]
    pub struct ComponentNameTablePair {
        pub name: Ident,
        pub table_name: Ident,
    }

    impl Parse for ComponentNameTablePair {
        fn parse(input: ParseStream) -> Result<Self> {
            let content;
            parenthesized!(content in input);
            let name = content.parse()?;
            content.parse::<Token![,]>()?;
            let table_name = content.parse()?;
            Ok(Self { name, table_name })
        }
    }

    #[derive(Clone)]
    pub struct ComponentDeclaration {
        pub ty_name: Ident,
        pub name_table_pairs: Vec<ComponentNameTablePair>,
        pub fields: Fields,
    }

    impl AddAttrs for ComponentDeclaration {}

    impl Parse for ComponentDeclaration {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::component>()?;
            let ty_name = input.parse()?;
            let content;
            bracketed!(content in input);
            let name_table_pairs = content
                .parse_terminated(ComponentNameTablePair::parse, Token![,])?
                .into_iter()
                .collect();
            let fields = input.parse()?;
            Ok(Self {
                ty_name,
                name_table_pairs,
                fields,
            })
        }
    }

    pub struct EntityDeclaration {
        pub name: Ident,
        pub id_name: Ident,
        pub id_ty_name: Ident,
        pub tables: Tables,
    }

    impl AddAttrs for EntityDeclaration {}

    impl Parse for EntityDeclaration {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::entity>()?;
            let name = input.parse()?;
            let id_name = input.parse()?;
            input.parse::<Token![:]>()?;
            let id_ty_name = input.parse()?;
            let tables = input.parse()?;
            input.parse::<Token![;]>()?;
            Ok(Self {
                name,
                id_name,
                id_ty_name,
                tables,
            })
        }
    }
    pub struct EntityMacroInput {
        pub entity_declaration: WithAttrs<EntityDeclaration>,
        pub component_declarations: Vec<WithAttrs<ComponentDeclaration>>,
        pub struct_attrs: WithAttrs<StructAttrsDeclaration>,
    }

    impl Parse for EntityMacroInput {
        fn parse(input: ParseStream) -> Result<Self> {
            let mut entities = vec![];
            let mut components = vec![];
            let mut struct_attrses = vec![];
            while !input.is_empty() {
                let attrs = input.parse()?;
                let la = input.lookahead1();
                if la.peek(kw::entity) {
                    let entity = input.parse::<EntityDeclaration>()?.add_attrs(attrs);
                    if entities.len() > 0 {
                        return Err(Error::new(
                            entity.value.name.span(),
                            "Only one entity declaration is allowed.",
                        ));
                    }
                    entities.push(entity);
                } else if la.peek(kw::component) {
                    components.push(input.parse::<ComponentDeclaration>()?.add_attrs(attrs));
                } else if la.peek(kw::struct_attrs) {
                    if struct_attrses.len() > 0 {
                        let struct_attrs = input.parse::<kw::struct_attrs>()?;
                        return Err(Error::new(
                            struct_attrs.span(),
                            "Only one struct_attrs declaration is allowed.",
                        ));
                    }
                    struct_attrses.push(input.parse::<StructAttrsDeclaration>()?.add_attrs(attrs));
                } else {
                    return Err(la.error());
                }
            }

            if entities.len() < 1 {
                return Err(Error::new(
                    input.span(),
                    "An entity declaration must be specified.",
                ));
            }

            struct_attrses.push(StructAttrsDeclaration.add_attrs(Attributes(vec![])));

            Ok(EntityMacroInput {
                entity_declaration: entities.remove(0),
                component_declarations: components,
                struct_attrs: struct_attrses.remove(0),
            })
        }
    }
}

mod gen_struct {
    use proc_macro2::TokenStream;
    use quote::ToTokens;
    use quote::format_ident;
    use quote::quote;
    use syn::Ident;

    use crate::{Attributes, Fields, Tables, macro_input};

    use super::WithAttrs;

    #[derive(Clone)]
    pub struct EntityStruct {
        pub attrs: Attributes,
        pub tables: Tables,
        pub struct_name: Ident,
        pub id_ty_name: Ident,
    }

    impl EntityStruct {
        pub fn new(
            a: &WithAttrs<macro_input::StructAttrsDeclaration>,
            ewa: &WithAttrs<macro_input::EntityDeclaration>,
        ) -> Self {
            Self {
                attrs: a.attrs.to_joined(&ewa.attrs),
                tables: ewa.value.tables.to_owned(),
                struct_name: ewa.value.name.to_owned(),
                id_ty_name: ewa.value.id_ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for EntityStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let EntityStruct {
                attrs,
                tables,
                struct_name: name,
                id_ty_name,
            } = self;
            tokens.extend(quote! {
              #attrs
              #tables
              pub struct #name {
                #[primary_key]
                #[auto_inc]
                pub id: #id_ty_name,
              }
            });
        }
    }

    #[derive(Clone)]
    pub struct ComponentStruct {
        pub attrs: Attributes,
        pub tables: Tables,
        pub struct_name: Ident,
        pub id_name: Ident,
        pub id_ty_name: Ident,
        pub fields: Fields,
    }

    impl ComponentStruct {
        pub fn new(
            a: &WithAttrs<macro_input::StructAttrsDeclaration>,
            cwa: &WithAttrs<macro_input::ComponentDeclaration>,
            ewa: &WithAttrs<macro_input::EntityDeclaration>,
        ) -> Self {
            Self {
                attrs: a.attrs.to_joined(&cwa.attrs),
                tables: Tables(
                    cwa.value
                        .name_table_pairs
                        .iter()
                        .map(|ntp| ntp.table_name.to_owned())
                        .collect(),
                ),
                struct_name: cwa.value.ty_name.to_owned(),
                id_name: ewa.value.id_name.to_owned(),
                id_ty_name: ewa.value.id_ty_name.to_owned(),
                fields: cwa.value.fields.to_owned(),
            }
        }
    }

    impl ToTokens for ComponentStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let ComponentStruct {
                attrs,
                tables,
                struct_name,
                id_name,
                id_ty_name,
                fields,
            } = self;
            tokens.extend(quote! {
              #attrs
              #tables
              pub struct #struct_name {
                #[primary_key]
                pub #id_name: #id_ty_name,
                #fields
              }
            });
        }
    }

    #[derive(Clone)]
    pub struct EntityHandleStruct {
        pub attrs: Attributes,
        pub struct_name: Ident,
        pub id_name: Ident,
        pub id_ty_name: Ident,
    }

    impl EntityHandleStruct {
        pub fn new(
            a: &WithAttrs<macro_input::StructAttrsDeclaration>,
            ewa: &WithAttrs<macro_input::EntityDeclaration>,
        ) -> Self {
            let struct_name = format_ident!("{}Handle", ewa.value.name);
            Self {
                attrs: a.attrs.to_owned(),
                struct_name,
                id_name: ewa.value.id_name.to_owned(),
                id_ty_name: ewa.value.id_ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for EntityHandleStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let EntityHandleStruct {
                attrs,
                struct_name,
                id_name,
                id_ty_name,
            } = self;
            tokens.extend(quote! {
              #attrs
              pub struct #struct_name<'a> {
                hidden: ecs::EntityHandleHidden<'a>,
                pub #id_name: #id_ty_name,
              }
            })
        }
    }

    #[derive(Clone)]
    pub struct WithComponentStruct {
        pub attrs: Attributes,
        pub struct_name: Ident,
        pub component_name: Ident,
        pub component_ty_name: Ident,
    }

    impl WithComponentStruct {
        pub fn new(
            a: &WithAttrs<macro_input::StructAttrsDeclaration>,
            ntp: &macro_input::ComponentNameTablePair,
            cwa: &WithAttrs<macro_input::ComponentDeclaration>,
        ) -> Self {
            Self {
                attrs: a.attrs.to_owned(),
                struct_name: format_ident!("With__{}__Component", ntp.name),
                component_name: ntp.name.to_owned(),
                component_ty_name: cwa.value.ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for WithComponentStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                attrs,
                struct_name: with_component_name,
                component_name,
                component_ty_name,
            } = self;
            tokens.extend(quote! {
              #attrs
              #[allow(non_camel_case_types)]
              pub struct #with_component_name<T> {
                #component_name: #component_ty_name,
                value: T,
              }
            })
        }
    }
}

mod gen_trait {
    use proc_macro2::TokenStream;
    use quote::{ToTokens, format_ident, quote};
    use syn::Ident;

    use crate::{gen_struct, macro_input};

    #[derive(Clone)]
    pub struct ComponentTrait {
        pub trait_name: Ident,
        pub component_name: Ident,
        pub component_ty_name: Ident,
        pub getter_fn_name: Ident,
        pub update_fn_name: Ident,
    }

    impl ComponentTrait {
        pub fn new(
            ntp: &macro_input::ComponentNameTablePair,
            c: &macro_input::ComponentDeclaration,
        ) -> Self {
            Self {
                component_name: ntp.name.to_owned(),
                trait_name: format_ident!("__{}__Trait", ntp.name),
                component_ty_name: c.ty_name.to_owned(),
                getter_fn_name: ntp.name.to_owned(),
                update_fn_name: format_ident!("update_{}", ntp.name),
            }
        }
    }

    impl ToTokens for ComponentTrait {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                component_name: _,
                trait_name,
                component_ty_name,
                getter_fn_name,
                update_fn_name,
            } = self;
            tokens.extend(quote! {
              #[allow(non_camel_case_types)]
              pub trait #trait_name: Sized {
                fn #getter_fn_name(&self) -> &#component_ty_name;
                fn #update_fn_name(self) -> Self;
              }
            })
        }
    }

    #[derive(Clone)]
    pub struct OptionComponentTrait {
        pub trait_name: Ident,
        pub component_name: Ident,
        pub component_ty_name: Ident,
        pub table_name: Ident,
        pub with_component_struct_name: Ident,
        pub with_fn_name: Ident,
        pub getter_fn_name: Ident,
        pub update_fn_name: Ident,
    }

    impl OptionComponentTrait {
        pub fn new(
            ntp: &macro_input::ComponentNameTablePair,
            d: &macro_input::ComponentDeclaration,
            wcs: &gen_struct::WithComponentStruct,
        ) -> Self {
            Self {
                trait_name: format_ident!("Option__{}__Trait", ntp.name),
                component_name: ntp.name.to_owned(),
                component_ty_name: d.ty_name.to_owned(),
                table_name: ntp.table_name.to_owned(),
                with_component_struct_name: wcs.struct_name.to_owned(),
                with_fn_name: format_ident!("with_{}", ntp.name),
                getter_fn_name: ntp.name.to_owned(),
                update_fn_name: format_ident!("update_{}", ntp.name),
            }
        }
    }

    impl ToTokens for OptionComponentTrait {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                trait_name,
                component_name,
                component_ty_name,
                table_name: _,
                with_component_struct_name,
                with_fn_name,
                getter_fn_name,
                update_fn_name,
            } = self;
            tokens.extend(quote! {
              #[allow(non_camel_case_types)]
              pub trait #trait_name: Sized {
                fn #with_fn_name(self) -> ::core::option::Option<#with_component_struct_name<Self>> {
                  Some(#with_component_struct_name {
                    #component_name: self.#getter_fn_name()?,
                    value: self,
                  })
                }
                fn #getter_fn_name(&self) -> ::core::option::Option<#component_ty_name>;
                fn #update_fn_name(&self, value: #component_ty_name) -> #component_ty_name;
              }
            })
        }
    }

    #[derive(Clone)]
    pub struct OptionComponentIterTrait {
        pub trait_name: Ident,
        pub option_trait_name: Ident,
        pub with_component_struct_name: Ident,
        pub with_fn_name: Ident,
    }

    impl OptionComponentIterTrait {
        pub fn new(oct: &OptionComponentTrait, wcs: &gen_struct::WithComponentStruct) -> Self {
            Self {
                trait_name: format_ident!("Option__{}__IterTrait", oct.component_name),
                option_trait_name: oct.trait_name.to_owned(),
                with_component_struct_name: wcs.struct_name.to_owned(),
                with_fn_name: oct.with_fn_name.to_owned(),
            }
        }
    }

    impl ToTokens for OptionComponentIterTrait {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                trait_name,
                option_trait_name,
                with_component_struct_name,
                with_fn_name,
            } = self;
            tokens.extend(quote! {
              #[allow(non_camel_case_types)]
              pub trait #trait_name<T: #option_trait_name>: Sized + Iterator<Item = T> {
                  fn #with_fn_name(self) -> impl Iterator<Item = #with_component_struct_name<T>> {
                      self.flat_map(|e| e.#with_fn_name())
                  }
              }
            })
        }
    }
}

mod gen_impl {
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
                fn #into_handle_fn_name(self, ctx: &spacetimedb::ReducerContext) -> #with_component_struct_name<#entity_handle_struct> {
                  let entity_id = self.entity_id;
                  #with_component_struct_name {
                    #component_name: self,
                    value: #entity_handle_struct { entity_id, hidden: ecs::EntityHandleHidden { ctx } },
                  }
                }
                fn #iter_fn_name(ctx: &spacetimedb::ReducerContext) -> impl Iterator<Item = #with_component_struct_name<#entity_handle_struct>> {
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
                ref getter_fn_name,
                ref update_fn_name,
                ..
            } = self.component_trait;
            let gen_trait::OptionComponentTrait {
                trait_name: ref option_trait_name,
                ..
            } = self.option_component_trait;
            tokens.extend(quote! {
              impl<T: #option_trait_name> #trait_name for #struct_name<T> {
                fn #getter_fn_name(&self) -> &#component_ty_name {
                  &self.#component_name
                }
                fn #update_fn_name(mut self) -> Self {
                  self.#component_name = self.value.#update_fn_name(self.#component_name);
                  self
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
                ref getter_fn_name,
                ref update_fn_name,
                ..
            } = self.component_trait;
            tokens.extend(quote! {
              impl<T: #trait_name> #trait_name for #struct_name<T> {
                fn #getter_fn_name(&self) -> &#component_ty_name {
                  self.value.#getter_fn_name()
                }
                fn #update_fn_name(mut self) -> Self {
                  self.value = self.value.#update_fn_name();
                  self
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
}

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
