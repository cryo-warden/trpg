use spacetimedb::{
    rand::{rngs::StdRng, RngCore},
    SpacetimeType,
};

#[derive(Debug, Clone, SpacetimeType)]
pub struct WeightedSelection<T: SpacetimeType> {
    weight: u8,
    value: T,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct WeightedSelector<T: SpacetimeType> {
    selections: Vec<WeightedSelection<T>>,
}

impl<T: SpacetimeType> WeightedSelector<T> {
    pub fn sample(&self, rng: &mut StdRng) -> &T {
        let total_weight = self.selections.iter().map(|v| v.weight as u32).sum::<u32>();
        let index = rng.next_u32() % total_weight;
        let mut running_total = 0;
        for s in &self.selections {
            running_total += s.weight;
            if running_total as u32 >= index {
                return &s.value;
            }
        }
        panic!("Invalid weighted selection.");
    }
}
