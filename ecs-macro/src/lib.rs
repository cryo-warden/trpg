extern crate proc_macro;

use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{
    Attribute, Error, Field, Ident, Result, Token, braced, parenthesized,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

mod kw {
    use syn::custom_keyword;

    custom_keyword!(entity);
    custom_keyword!(component);
    custom_keyword!(tables);
}

#[derive(Clone)]
struct Attributes(Vec<Attribute>);

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

impl<T: ToTokens> ToTokens for WithAttrs<T> {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let WithAttrs { attrs, value } = self;
        tokens.extend(quote! {
          #attrs
          #value
        });
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
          #(#fields)*
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
        Error, Ident, Result, Token,
        parse::{Parse, ParseStream},
    };

    use crate::{AddAttrs, Fields, Tables, WithAttrs, kw};

    #[derive(Clone)]
    pub struct ComponentDeclaration {
        pub name: Ident,
        pub ty_name: Ident,
        pub tables: Tables,
        pub fields: Fields,
    }

    impl AddAttrs for ComponentDeclaration {}

    impl Parse for ComponentDeclaration {
        fn parse(input: ParseStream) -> Result<Self> {
            input.parse::<kw::component>()?;
            let name = input.parse()?;
            input.parse::<Token![:]>()?;
            let ty_name = input.parse()?;
            let tables = input.parse()?;
            let fields = input.parse()?;
            Ok(Self {
                name,
                ty_name,
                tables,
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
    }

    impl Parse for EntityMacroInput {
        fn parse(input: ParseStream) -> Result<Self> {
            let mut entities = vec![];
            let mut components = vec![];
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

            Ok(EntityMacroInput {
                entity_declaration: entities.remove(0),
                component_declarations: components,
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

    use crate::{
        Attributes, Fields, Tables,
        macro_input::{ComponentDeclaration, EntityDeclaration},
    };

    use super::WithAttrs;

    #[derive(Clone)]
    pub struct EntityStruct {
        pub attrs: Attributes,
        pub tables: Tables,
        pub struct_name: Ident,
        pub id_ty_name: Ident,
    }

    impl EntityStruct {
        pub fn new(ewa: &WithAttrs<EntityDeclaration>) -> Self {
            Self {
                attrs: ewa.attrs.to_owned(),
                tables: ewa.value.tables.to_owned(),
                struct_name: ewa.value.name.to_owned(),
                id_ty_name: ewa.value.id_ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for EntityStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let EntityStruct {
                struct_name: name,
                id_ty_name,
                tables,
                attrs,
            } = self;
            tokens.extend(quote! {
              #attrs
              #tables
              pub struct #name {
                pub id: #id_ty_name,
              }
            });
        }
    }

    #[derive(Clone)]
    pub struct ComponentStruct {
        pub tables: Tables,
        pub struct_name: Ident,
        pub id_name: Ident,
        pub id_ty_name: Ident,
        pub fields: Fields,
    }

    impl ComponentStruct {
        pub fn new(
            cwa: &WithAttrs<ComponentDeclaration>,
            ewa: &WithAttrs<EntityDeclaration>,
        ) -> Self {
            Self {
                tables: cwa.value.tables.to_owned(),
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
                tables,
                struct_name,
                id_name,
                id_ty_name,
                fields,
            } = self;
            tokens.extend(quote! {
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
        pub struct_name: Ident,
        pub id_name: Ident,
        pub id_ty_name: Ident,
    }

    impl EntityHandleStruct {
        pub fn new(ewa: &WithAttrs<EntityDeclaration>) -> Self {
            let struct_name = format_ident!("{}Handle", ewa.value.name);
            Self {
                struct_name,
                id_name: ewa.value.id_name.to_owned(),
                id_ty_name: ewa.value.id_ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for EntityHandleStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let EntityHandleStruct {
                struct_name,
                id_name,
                id_ty_name,
            } = self;
            tokens.extend(quote! {
              pub struct #struct_name<'a> {
                pub ctx: &'a spacetimedb::ReducerContext,
                pub #id_name: #id_ty_name,
              }
            })
        }
    }

    #[derive(Clone)]
    pub struct WithComponentStruct {
        pub struct_name: Ident,
        pub component_name: Ident,
        pub component_ty_name: Ident,
    }

    impl WithComponentStruct {
        pub fn new(cwa: &WithAttrs<ComponentDeclaration>) -> Self {
            Self {
                struct_name: format_ident!("With{}", cwa.value.ty_name),
                component_name: cwa.value.name.to_owned(),
                component_ty_name: cwa.value.ty_name.to_owned(),
            }
        }
    }

    impl ToTokens for WithComponentStruct {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                struct_name: with_component_name,
                component_name,
                component_ty_name,
            } = self;
            tokens.extend(quote! {
              pub struct #with_component_name<T> {
                pub #component_name: #component_ty_name,
                pub value: T,
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
        pub component_ty_name: Ident,
        pub getter_fn_name: Ident,
        pub update_fn_name: Ident,
    }

    impl ComponentTrait {
        pub fn new(c: &macro_input::ComponentDeclaration) -> Self {
            Self {
                trait_name: format_ident!("{}Trait", c.ty_name),
                component_ty_name: c.ty_name.to_owned(),
                getter_fn_name: c.name.to_owned(),
                update_fn_name: format_ident!("update_{}", c.name),
            }
        }
    }

    impl ToTokens for ComponentTrait {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
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
        pub source: macro_input::ComponentDeclaration,
        pub trait_name: Ident,
        pub component_name: Ident,
        pub component_ty_name: Ident,
        pub with_component_struct_name: Ident,
        pub with_fn_name: Ident,
        pub getter_fn_name: Ident,
        pub update_fn_name: Ident,
    }

    impl OptionComponentTrait {
        pub fn new(
            c: &macro_input::ComponentDeclaration,
            wcs: &gen_struct::WithComponentStruct,
        ) -> Self {
            Self {
                source: c.to_owned(),
                trait_name: format_ident!("Option{}Trait", c.ty_name),
                component_name: c.name.to_owned(),
                component_ty_name: c.ty_name.to_owned(),
                with_component_struct_name: wcs.struct_name.to_owned(),
                with_fn_name: format_ident!("with_{}", c.name),
                getter_fn_name: c.name.to_owned(),
                update_fn_name: format_ident!("update_{}", c.name),
            }
        }
    }

    impl ToTokens for OptionComponentTrait {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            let Self {
                source: _,
                trait_name,
                component_name,
                component_ty_name,
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
}

mod gen_impl {
    use proc_macro2::TokenStream;
    use quote::{ToTokens, quote};
    use syn::Ident;

    use crate::{gen_struct, gen_trait};

    pub struct ComponentStructImpl {
        pub component_struct: gen_struct::ComponentStruct,
        pub with_component_struct: gen_struct::WithComponentStruct,
        pub entity_handle_struct: gen_struct::EntityHandleStruct,
    }

    impl ComponentStructImpl {
        pub fn new(
            cs: &gen_struct::ComponentStruct,
            wcs: &gen_struct::WithComponentStruct,
            ehs: &gen_struct::EntityHandleStruct,
        ) -> Self {
            Self {
                component_struct: cs.to_owned(),
                with_component_struct: wcs.to_owned(),
                entity_handle_struct: ehs.to_owned(),
            }
        }
    }

    impl ToTokens for ComponentStructImpl {
        fn to_tokens(&self, tokens: &mut TokenStream) {
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
                fn into_handle(self, ctx: &spacetimedb::ReducerContext) -> #with_component_struct_name<#entity_handle_struct> {
                  let entity_id = self.entity_id;
                  #with_component_struct_name {
                    #component_name: self,
                    value: #entity_handle_struct { entity_id, ctx },
                  }
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
                table_name: oct.source.tables.0.first().unwrap().to_owned(), // WIP Eliminate unwrap call. Change return type to syn::Result.
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
                  self.ctx.db.#table_name().#id_name().find(self.#id_name)
                }
                fn #update_fn_name(&self, value: #component_ty_name) -> #component_ty_name {
                  self.ctx.db.#table_name().#id_name().update(value)
                }
              }
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

    component_struct_impls: Vec<gen_impl::ComponentStructImpl>,
    replacement_component_trait_for_with_component_struct_impls:
        Vec<gen_impl::ReplacementComponentTraitForWithComponentStructImpl>,
    component_trait_for_with_component_struct_impls:
        Vec<gen_impl::ComponentTraitForWithComponentStructImpl>,
    option_component_trait_for_with_component_struct_impls:
        Vec<gen_impl::OptionComponentTraitForWithComponentStructImpl>,
    option_component_trait_for_entity_handle_struct_impls:
        Vec<gen_impl::OptionComponentTraitForEntityHandleStructImpl>,
}

impl Parse for EntityMacro {
    fn parse(input: ParseStream) -> Result<Self> {
        let macro_input::EntityMacroInput {
            entity_declaration,
            component_declarations,
        } = input.parse()?;

        let entity_struct = gen_struct::EntityStruct::new(&entity_declaration);
        let component_structs = component_declarations
            .iter()
            .map(|d| gen_struct::ComponentStruct::new(d, &entity_declaration))
            .collect::<Vec<_>>();
        let entity_handle_struct = gen_struct::EntityHandleStruct::new(&entity_declaration);
        let with_component_structs = component_declarations
            .iter()
            .map(|d| gen_struct::WithComponentStruct::new(d))
            .collect::<Vec<_>>();

        let component_traits = component_declarations
            .iter()
            .map(|d| gen_trait::ComponentTrait::new(&d.value))
            .collect::<Vec<_>>();
        let option_component_traits = component_declarations
            .iter()
            .map(|d| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| wcs.component_ty_name == d.value.ty_name)
                    .ok_or(Error::new(
                        d.value.ty_name.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(gen_trait::OptionComponentTrait::new(&d.value, wcs))
            })
            .collect::<Result<Vec<_>>>()?;

        let component_struct_impls = component_structs
            .iter()
            .map(|cs| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| wcs.component_ty_name == cs.struct_name)
                    .ok_or(Error::new(
                        cs.struct_name.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(gen_impl::ComponentStructImpl::new(
                    cs,
                    wcs,
                    &entity_handle_struct,
                ))
            })
            .collect::<Result<Vec<_>>>()?;

        let replacement_component_trait_for_with_component_struct_impls = with_component_structs
            .iter()
            .map(|wcs| {
                let ct = component_traits
                    .iter()
                    .find(|ct| ct.component_ty_name == wcs.component_ty_name)
                    .ok_or(Error::new(
                        wcs.struct_name.span(),
                        "Cannot find the corresponding component trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component_ty_name == wcs.component_ty_name)
                    .ok_or(Error::new(
                        wcs.struct_name.span(),
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
                    .filter(|ct| ct.component_ty_name != wcs.component_ty_name)
                    .map(|ct| gen_impl::ComponentTraitForWithComponentStructImpl::new(wcs, ct))
            })
            .collect::<Vec<_>>();

        let option_component_trait_for_with_component_struct_impls = with_component_structs
            .iter()
            .flat_map(|wcs| {
                option_component_traits
                    .iter()
                    .filter(|oct| oct.component_ty_name != wcs.component_ty_name)
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

        Ok(Self {
            entity_struct,
            component_structs,
            entity_handle_struct,
            with_component_structs,

            component_traits,
            option_component_traits,

            component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
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

            component_struct_impls,
            replacement_component_trait_for_with_component_struct_impls,
            component_trait_for_with_component_struct_impls,
            option_component_trait_for_with_component_struct_impls,
            option_component_trait_for_entity_handle_struct_impls,
        } = self;
        tokens.extend(quote! {
          #entity_struct
          #(#component_structs)*
          #entity_handle_struct
          #(#with_component_structs)*

          #(#component_traits)*
          #(#option_component_traits)*

          #(#component_struct_impls)*
          #(#replacement_component_trait_for_with_component_struct_impls)*
          #(#component_trait_for_with_component_struct_impls)*
          #(#option_component_trait_for_with_component_struct_impls)*
          #(#option_component_trait_for_entity_handle_struct_impls)*
        });
    }
}

#[proc_macro]
pub fn entity(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let entity_macro = parse_macro_input!(input as EntityMacro);

    proc_macro::TokenStream::from(quote! { #entity_macro })
}
