use quote::ToTokens;
use syn::{
    Attribute, Block, Error, ExprStruct, FieldsNamed, Ident, ItemImpl, Result, Signature, Token,
    bracketed,
    fold::Fold,
    parenthesized,
    parse::{Parse, ParseStream},
    punctuated::Punctuated,
};

use crate::{
    field_value_wrap::FieldValueWrap, field_wrap::FieldWrap, fn_arg_wrap::FnArgWrap,
    outer_attribute_wrap::OuterAttributeWrap, seca::TryToSeca,
    substitution_tuple::SubstitutionTuple, substitutor::Substitutor,
};

pub struct Dryer {
    pub name: String,
    pub names: Vec<String>,
    pub table: Vec<SubstitutionTuple>,
    pub error: Option<Error>,
}

fn add_error(error: Option<Error>, new_error: Error) -> Option<Error> {
    if let Some(mut old_error) = error {
        old_error.combine(new_error);
        Some(old_error)
    } else {
        Some(new_error)
    }
}

impl Dryer {
    pub fn dry_nodes<T, U>(&mut self, items: T) -> Vec<U>
    where
        T: IntoIterator<Item = U>,
        U: TryToSeca + Clone + Parse + ToTokens,
    {
        let mut items = items.into_iter();
        let mut results = vec![];
        let mut error = self.error.clone();
        while let Some(curr) = items.next() {
            if let Some(seca) = curr.seca(&self.name) {
                let sources: Vec<U> = (&mut items).take(seca.count).collect();
                for substitutions in &self.table {
                    let substitutor = Substitutor {
                        names: &self.names,
                        substitutions,
                    };
                    for source in &sources {
                        match substitutor.substitute(source.clone()) {
                            Ok(substitution) => results.push(substitution),
                            Err(new_error) => {
                                error = add_error(
                                    error,
                                    Error::new_spanned(
                                        source,
                                        format!("Substitution failed: {}", new_error),
                                    ),
                                );
                            }
                        }
                    }
                }
            } else {
                results.push(curr);
            }
        }
        self.error = error;
        results
    }

    pub fn try_dry_block(&mut self, block: Block) -> Result<Block> {
        let result = self.fold_block(block);
        if let Some(ref error) = self.error {
            Err(error.clone())
        } else {
            Ok(result)
        }
    }
}

impl Fold for Dryer {
    fn fold_block(&mut self, i: Block) -> Block {
        let nodes: Vec<_> = i.stmts.into_iter().map(|s| self.fold_stmt(s)).collect();
        Block {
            stmts: self.dry_nodes(nodes),
            ..i
        }
    }
    fn fold_item_impl(&mut self, i: ItemImpl) -> ItemImpl {
        let nodes: Vec<_> = i
            .items
            .into_iter()
            .map(|i| self.fold_impl_item(i))
            .collect();
        ItemImpl {
            items: self.dry_nodes(nodes),
            attrs: self.fold_attributes(i.attrs),
            generics: self.fold_generics(i.generics),
            ..i
        }
    }
    fn fold_fields_named(&mut self, i: syn::FieldsNamed) -> syn::FieldsNamed {
        let nodes: Vec<_> = i
            .named
            .into_iter()
            .map(|f| FieldWrap(self.fold_field(f)))
            .collect();

        let mut named = Punctuated::new();
        for n in self.dry_nodes(nodes) {
            named.push_value(n.0);
            named.push_punct(Default::default());
        }

        FieldsNamed { named, ..i }
    }
    fn fold_expr_struct(&mut self, i: ExprStruct) -> ExprStruct {
        let nodes: Vec<_> = i
            .fields
            .into_iter()
            .map(|f| FieldValueWrap(self.fold_field_value(f)))
            .collect();

        let mut fields = Punctuated::new();
        for n in self.dry_nodes(nodes) {
            fields.push_value(n.0);
            fields.push_punct(Default::default());
        }

        ExprStruct {
            fields,
            attrs: self.fold_attributes(i.attrs),
            ..i
        }
    }
    fn fold_signature(&mut self, i: Signature) -> Signature {
        let nodes: Vec<_> = i
            .inputs
            .into_iter()
            .map(|f| FnArgWrap(self.fold_fn_arg(f)))
            .collect();

        let mut inputs = Punctuated::new();
        for n in self.dry_nodes(nodes) {
            inputs.push_value(n.0);
            inputs.push_punct(Default::default());
        }

        Signature { inputs, ..i }
    }
    fn fold_attributes(&mut self, i: Vec<Attribute>) -> Vec<Attribute> {
        let nodes: Vec<_> = i
            .into_iter()
            .map(|i| OuterAttributeWrap(self.fold_attribute(i)))
            .collect();
        self.dry_nodes(nodes)
            .into_iter()
            .map(|OuterAttributeWrap(attr)| attr)
            .collect()
    }
}

impl Parse for Dryer {
    fn parse(input: ParseStream) -> Result<Self> {
        let ident: Ident = input.parse()?;
        input.parse::<Token![!]>()?;

        let result = Self {
            name: ident.to_string(),
            ..Default::default()
        };

        let content;
        parenthesized!(content in input);
        result.parse_args(&content)
    }
}

impl Default for Dryer {
    fn default() -> Self {
        Self {
            name: "seca".into(),
            names: vec![],
            table: vec![],
            error: None,
        }
    }
}

impl Dryer {
    pub fn parse_args(mut self, input: ParseStream) -> Result<Self> {
        let content;
        parenthesized!(content in input);
        let names = content
            .parse_terminated(Ident::parse, Token![,])?
            .into_iter()
            .map(|i| i.to_string())
            .collect();

        input.parse::<Token![,]>()?;

        let content;
        bracketed!(content in input);
        let table = content
            .parse_terminated(SubstitutionTuple::parse, Token![,])?
            .into_iter()
            .collect();

        self.names = names;
        self.table = table;

        Ok(self)
    }
}
