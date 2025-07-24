use crate::tests::test1::Origin;

pub struct Glad;

impl Glad {
    pub fn init(_: &Origin, g: Glad) -> Glad {
        g
    }
}
