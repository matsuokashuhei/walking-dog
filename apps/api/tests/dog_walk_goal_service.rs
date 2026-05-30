use walking_dog::{
    entity::{dog_walk_goal, walk_amount},
    service::dog_walk_goal::{
        DailyGoalUpsertPlan, plan_daily_goal_upsert, validate_daily_goal_minutes,
    },
};

fn current_goal(
    effective_from: chrono::NaiveDate,
    minutes: i32,
    cycle_days: i32,
) -> dog_walk_goal::Model {
    let now = chrono::DateTime::from_timestamp(1_800_000_000, 0).unwrap();
    dog_walk_goal::Model {
        id: uuid::Uuid::now_v7(),
        dog_id: uuid::Uuid::now_v7(),
        walk_amount: walk_amount::Model {
            minutes,
            cycle_days,
        },
        effective_from,
        effective_to: None,
        created_at: now.into(),
        updated_at: now.into(),
    }
}

#[test]
fn daily_goal_plan_updates_goal_that_started_today() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let goal = current_goal(today, 30, 1);

    let plan = plan_daily_goal_upsert(Some(&goal), 45, today).unwrap();

    assert_eq!(plan, DailyGoalUpsertPlan::UpdateCurrent { minutes: 45 });
}

#[test]
fn daily_goal_plan_replaces_prior_open_goal_from_today_onward() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let previous_day = chrono::NaiveDate::from_ymd_opt(2026, 5, 29).unwrap();
    let goal = current_goal(previous_day, 30, 1);

    let plan = plan_daily_goal_upsert(Some(&goal), 45, today).unwrap();

    assert_eq!(
        plan,
        DailyGoalUpsertPlan::ReplaceCurrent {
            close_existing_to: previous_day,
            minutes: 45,
        }
    );
}

#[test]
fn daily_goal_plan_skips_same_daily_goal() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let goal = current_goal(today, 30, 1);

    let plan = plan_daily_goal_upsert(Some(&goal), 30, today).unwrap();

    assert_eq!(plan, DailyGoalUpsertPlan::Noop);
}

#[test]
fn daily_goal_minutes_are_validated_in_service_layer() {
    assert!(validate_daily_goal_minutes(9).is_err());
    assert!(validate_daily_goal_minutes(121).is_err());
    assert_eq!(validate_daily_goal_minutes(30).unwrap(), 30);
}
