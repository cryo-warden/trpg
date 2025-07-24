use syn::{LitInt, parse::Parse};

use crate::{path_ends_with::PathEndsWith, try_to_macro::TryToMacro};

pub struct Seca {
    pub count: usize,
}

pub trait TryToSeca {
    fn seca(&self) -> Option<Seca>;
}

impl<T: TryToMacro> TryToSeca for T {
    fn seca(&self) -> Option<Seca> {
        let mac = self.try_to_macro()?;
        mac.path_ends_with("seca").then_some(())?;
        let i = &mac.parse_body_with(LitInt::parse).ok()?;
        let count = i.base10_parse().ok()?;
        Some(Seca { count })
    }
}
