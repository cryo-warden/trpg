use spacetimedb::rand::{rngs::StdRng, RngCore};

pub trait RngRange {
    fn get_range<T, U>(&mut self, min: T, max: T) -> U
    where
        T: Into<u32>,
        U: TryFrom<u32>;
}

impl RngRange for StdRng {
    fn get_range<T, U>(&mut self, min: T, max: T) -> U
    where
        T: Into<u32>,
        U: TryFrom<u32>,
    {
        let min = min.into();
        let max = max.into();

        if min >= max {
            min
        } else {
            min + self.next_u32() % (max - min)
        }
        .try_into()
        .ok()
        .unwrap()
    }
}
