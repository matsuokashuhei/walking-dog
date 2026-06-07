use walking_dog::{
    entity::{dog_walk_goal, walk_amount},
    service::dog_walk_goal::{
        GoalUpsertPlan, plan_goal_upsert, validate_daily_goal_minutes, validate_goal_walk_amount,
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

fn walk_amount(minutes: i32, cycle_days: i32) -> walk_amount::Model {
    walk_amount::Model {
        minutes,
        cycle_days,
    }
}

#[test]
fn goal_plan_updates_goal_that_started_today() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let goal = current_goal(today, 30, 1);

    let plan = plan_goal_upsert(Some(&goal), walk_amount(45, 1), today).unwrap();

    assert_eq!(
        plan,
        GoalUpsertPlan::UpdateCurrent {
            walk_amount: walk_amount(45, 1)
        }
    );
}

#[test]
fn goal_plan_replaces_prior_open_goal_from_today_onward() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let previous_day = chrono::NaiveDate::from_ymd_opt(2026, 5, 29).unwrap();
    let goal = current_goal(previous_day, 30, 1);

    let plan = plan_goal_upsert(Some(&goal), walk_amount(315, 7), today).unwrap();

    assert_eq!(
        plan,
        GoalUpsertPlan::ReplaceCurrent {
            close_existing_to: previous_day,
            walk_amount: walk_amount(315, 7),
        }
    );
}

#[test]
fn goal_plan_skips_same_walk_amount() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let goal = current_goal(today, 210, 7);

    let plan = plan_goal_upsert(Some(&goal), walk_amount(210, 7), today).unwrap();

    assert_eq!(plan, GoalUpsertPlan::Noop);
}

#[test]
fn goal_plan_updates_when_cycle_days_changes_even_if_minutes_match() {
    let today = chrono::NaiveDate::from_ymd_opt(2026, 5, 30).unwrap();
    let goal = current_goal(today, 70, 1);

    let plan = plan_goal_upsert(Some(&goal), walk_amount(70, 7), today).unwrap();

    assert_eq!(
        plan,
        GoalUpsertPlan::UpdateCurrent {
            walk_amount: walk_amount(70, 7)
        }
    );
}

#[test]
fn goal_walk_amount_is_validated_in_service_layer() {
    assert!(validate_goal_walk_amount(&walk_amount(-1, 1)).is_err());
    assert!(validate_goal_walk_amount(&walk_amount(121, 1)).is_err());
    assert!(validate_goal_walk_amount(&walk_amount(-1, 7)).is_err());
    assert!(validate_goal_walk_amount(&walk_amount(841, 7)).is_err());
    assert!(validate_goal_walk_amount(&walk_amount(30, 2)).is_err());
    assert_eq!(
        validate_goal_walk_amount(&walk_amount(0, 1)).unwrap(),
        walk_amount(0, 1)
    );
    assert_eq!(
        validate_goal_walk_amount(&walk_amount(0, 7)).unwrap(),
        walk_amount(0, 7)
    );
    assert_eq!(
        validate_goal_walk_amount(&walk_amount(210, 7)).unwrap(),
        walk_amount(210, 7)
    );
    assert_eq!(validate_daily_goal_minutes(0).unwrap(), 0);
}
