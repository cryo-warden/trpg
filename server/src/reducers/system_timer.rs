use spacetimedb::table;

use crate::reducers::system::run_system;

#[table(accessor = system_timers, scheduled(run_system))]
pub struct SystemTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: spacetimedb::ScheduleAt,
}
