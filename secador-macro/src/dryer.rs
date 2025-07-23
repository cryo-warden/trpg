use quote::ToTokens;
use syn::{
    Block, Error, Ident, ItemImpl, Result, Token, bracketed,
    fold::Fold,
    parenthesized,
    parse::{Parse, ParseStream},
};

use crate::{seca::IsSeca, substitution_tuple::SubstitutionTuple, substitutor::Substitutor};

pub struct Dryer {
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
        U: IsSeca + Clone + Parse + ToTokens,
    {
        let mut items = items.into_iter();
        let mut results = vec![];
        let mut error = self.error.clone();
        while let Some(curr) = items.next() {
            if let Some(seca) = curr.seca() {
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

// WIP Write a function which processes a Vec<Field> or Intoiterator<Item = Field>.
// WIP Write a function which processes a sequence of field assignments.
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
            ..i
        }
    }
}

impl Parse for Dryer {
    fn parse(input: ParseStream) -> Result<Self> {
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

        Ok(Self {
            names,
            table,
            error: None,
        })
    }
}
