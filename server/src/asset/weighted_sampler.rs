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
    /// Draw a sample, or `None` when there is nothing to draw — an empty
    /// selector or one whose weights sum to zero. Callers decide how to treat a
    /// missing draw (skip, default, etc.), so a minimal/degenerate selector
    /// never panics.
    fn sample(&self, rng: &mut StdRng) -> Option<&Self::Result> {
        let selections = self.selections();
        let total_weight = selections.iter().map(|v| v.weight()).sum::<Weight>();
        if total_weight == 0 {
            return None;
        }
        // `index` is uniform in `0..total_weight` (get_range's max is
        // exclusive). Walking the cumulative weights, the sample whose running
        // total first exceeds `index` owns that slot. This must be a strict `>`:
        // with `>=`, `index == running_total` would land on the *previous*
        // sample, giving the first sample one extra unit of weight and the last
        // one unit too few.
        let index = rng.get_range(0, total_weight);
        let mut running_total = 0;
        for s in selections {
            running_total += s.weight();
            if running_total > index {
                return Some(s.value());
            }
        }
        // Unreachable while total_weight > 0, but return None rather than panic.
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spacetimedb::rand::SeedableRng;

    struct Sample {
        weight: Weight,
        value: u32,
    }
    impl WeightedSample for Sample {
        type Result = u32;
        fn value(&self) -> &u32 {
            &self.value
        }
        fn weight(&self) -> Weight {
            self.weight
        }
    }

    struct Sampler {
        selections: Vec<Sample>,
    }
    impl WeightedSampler for Sampler {
        type Result = u32;
        type Sample = Sample;
        fn selections(&self) -> &Vec<Sample> {
            &self.selections
        }
    }

    fn counts(sampler: &Sampler, draws: u32) -> Vec<u32> {
        let mut rng = StdRng::seed_from_u64(0);
        let mut counts = vec![0u32; sampler.selections.len()];
        for _ in 0..draws {
            let v = *sampler.sample(&mut rng).expect("non-empty sampler");
            counts[v as usize] += 1;
        }
        counts
    }

    #[test]
    fn an_empty_selector_yields_no_sample_instead_of_panicking() {
        let mut rng = StdRng::seed_from_u64(0);
        let sampler = Sampler { selections: vec![] };
        assert!(sampler.sample(&mut rng).is_none());
    }

    #[test]
    fn samples_are_drawn_in_proportion_to_weight() {
        let sampler = Sampler {
            selections: vec![
                Sample { weight: 5, value: 0 },
                Sample { weight: 4, value: 1 },
            ],
        };
        let counts = counts(&sampler, 90_000);
        // Expect roughly a 5:4 split; the ratio should sit near 1.25.
        let ratio = counts[0] as f64 / counts[1] as f64;
        assert!(
            (ratio - 1.25).abs() < 0.05,
            "expected ~1.25 ratio, got {ratio} from {counts:?}"
        );
    }

    #[test]
    fn every_slot_including_the_last_is_reachable() {
        // Regression guard for the off-by-one: with `>=` the final sample was
        // shorted a unit of weight. A single-weight tail must still appear.
        let sampler = Sampler {
            selections: vec![
                Sample { weight: 1, value: 0 },
                Sample { weight: 1, value: 1 },
            ],
        };
        let counts = counts(&sampler, 20_000);
        assert!(counts.iter().all(|&c| c > 0), "unreachable slot: {counts:?}");
        let ratio = counts[0] as f64 / counts[1] as f64;
        assert!(
            (ratio - 1.0).abs() < 0.05,
            "equal weights should be ~even, got {counts:?}"
        );
    }
}
