use syn::{LitInt, parse::Parse};

use crate::{path_ends_with::PathEndsWith, try_to_macro::TryToMacro};

pub struct Seca {
    pub count: usize,
}

pub trait TryToSeca {
    fn seca(&self, name: &str) -> Option<Seca>;
}

impl<T: TryToMacro> TryToSeca for T {
    fn seca(&self, name: &str) -> Option<Seca> {
        let mac = self.try_to_macro()?;
        mac.path_ends_with(name).then_some(())?;
        let i = &mac.parse_body_with(LitInt::parse).ok()?;
        let count = i.base10_parse().ok()?;
        Some(Seca { count })
    }
}
