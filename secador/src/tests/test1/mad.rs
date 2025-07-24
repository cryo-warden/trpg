use crate::tests::test1::Origin;

pub struct Mad;

impl Mad {
    pub fn init(_: &Origin, m: Mad) -> Mad {
        m
    }
}
