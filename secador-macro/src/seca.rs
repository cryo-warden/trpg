use syn::{LitInt, parse::Parse};

use crate::{path_ends_with::PathEndsWith, try_to_macro::TryToMacro};

pub struct Seca {
    pub count: usize,
}

pub trait IsSeca {
    fn seca(&self) -> Option<Seca>;
}

impl<T: TryToMacro> IsSeca for T {
    fn seca(&self) -> Option<Seca> {
        if let Some(mac) = self.try_to_macro() {
            if mac.path_ends_with("seca") {
                if let Some(i) = &mac.parse_body_with(LitInt::parse).ok() {
                    if let Some(count) = i.base10_parse().ok() {
                        return Some(Seca { count });
                    }
                }
            }
        }
        return None;
    }
}
