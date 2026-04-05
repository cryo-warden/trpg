use spacetimedb::{rand::rngs::StdRng, SpacetimeType};

use crate::asset::rng_range::RngRange;

pub type Weight = u32;

pub trait WeightedSample {
    type Result: SpacetimeType;
    fn value(&self) -> &Self::Result;
    fn weight(&self) -> Weight;
}

pub trait WeightedSampler {
    type Result: SpacetimeType;
    type Sample: WeightedSample<Result = Self::Result>;
    fn selections(&self) -> &Vec<Self::Sample>;
    fn sample(&self, rng: &mut StdRng) -> &Self::Result {
        let selections = self.selections();
        let total_weight = selections.iter().map(|v| v.weight()).sum::<Weight>();
        let index = rng.get_range(0, total_weight);
        let mut running_total = 0;
        for s in selections {
            running_total += s.weight();
            if running_total >= index {
                return &s.value();
            }
        }
        panic!("Invalid weighted selection.");
    }
}
