use crate::tests::test_single_line::Origin;

pub struct Mad;

impl Mad {
    pub fn init(_: &Origin, m: Mad) -> Mad {
        m
    }
}
