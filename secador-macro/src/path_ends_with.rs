use crate::try_to_macro::TryToMacro;

pub trait PathEndsWith<'a> {
    fn path_ends_with(&'a self, ending: &str) -> bool;
}

impl<'a, T> PathEndsWith<'a> for T
where
    T: TryToMacro + 'a,
{
    fn path_ends_with(&'a self, ending: &str) -> bool {
        if let Some(mac) = TryToMacro::try_to_macro(self) {
            if let Some(s) = mac.path.segments.last() {
                return s.ident.to_string() == ending;
            }
        }
        return false;
    }
}
