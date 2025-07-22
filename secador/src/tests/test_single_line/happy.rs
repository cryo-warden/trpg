use crate::tests::test_single_line::Origin;

pub struct Happy;

impl Happy {
    pub fn init(_: &Origin, h: Happy) -> Happy {
        h
    }
}
