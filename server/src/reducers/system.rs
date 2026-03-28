use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext};

use crate::{reducers::system_timer::SystemTimer, system::execute_all_systems};

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    let ecs = ctx.ecs();

    execute_all_systems(ecs);

    Ok(())
}
