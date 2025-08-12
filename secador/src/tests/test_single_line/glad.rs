use crate::tests::test_single_line::Origin;

pub struct Glad;

impl Glad {
    pub fn init(_: &Origin, g: Glad) -> Glad {
        g
    }
}
