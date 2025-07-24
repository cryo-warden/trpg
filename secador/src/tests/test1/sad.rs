use crate::tests::test1::Origin;

pub struct Sad;

impl Sad {
    pub fn init(_: &Origin, s: Sad) -> Sad {
        s
    }
}
