use syn::{ImplItem, Macro, Stmt};

pub trait TryToMacro {
    fn try_to_macro(&self) -> Option<&Macro>;
}

impl TryToMacro for Macro {
    fn try_to_macro(&self) -> Option<&Macro> {
        Some(self)
    }
}

impl TryToMacro for Stmt {
    fn try_to_macro(&self) -> Option<&Macro> {
        if let Stmt::Macro(sm) = self {
            sm.mac.try_to_macro()
        } else {
            None
        }
    }
}

impl TryToMacro for ImplItem {
    fn try_to_macro(&self) -> Option<&Macro> {
        if let ImplItem::Macro(m) = self {
            m.mac.try_to_macro()
        } else {
            None
        }
    }
}
