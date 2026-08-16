use spacetimedb::table;

/// A reusable set of traits eligible to be drawn onto a differentiable entity
/// (see DifferentiableComponent), plus how many to draw. NOT an object pool —
/// a palette: the caller picks from it, it retires nothing.
#[table(accessor = trait_palettes)]
#[derive(Debug, Clone)]
pub struct TraitPalette {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    /// Trait ids eligible to be drawn.
    pub trait_ids: Vec<u32>,
    /// Weighted count distribution for one draw: index = number of traits,
    /// value = its weight (index 1 usually dominant, 2 small, 3 vanishing;
    /// index 0 = leave the entity plain). Empty draws nothing.
    pub count_weights: Vec<u8>,
}
