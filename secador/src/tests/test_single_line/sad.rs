use crate::tests::test_single_line::Origin;

pub struct Sad;

impl Sad {
    pub fn init(_: &Origin, s: Sad) -> Sad {
        s
    }
}
