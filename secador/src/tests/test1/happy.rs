use crate::tests::test1::Origin;

pub struct Happy;

impl Happy {
    pub fn init(_: &Origin, h: Happy) -> Happy {
        h
    }
}
