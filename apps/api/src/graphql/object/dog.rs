use async_graphql::{
    ComplexObject, Context, Enum, Result, SimpleObject,
    connection::{Connection, Edge, EmptyFields, query},
};
use chrono::Datelike;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use url::Url;

use crate::{
    entity::{dog_walk_goal, sea_orm_active_enums::GenderType, user, walk, walk_dog},
    graphql::{
        cursor::UuidCursor,
        error::AppError,
        object::{dog_walk_goal::DogWalkGoal, walk::Walk, walk_connection::WalkConnectionFields},
    },
    util::storage::avatar_url,
};

#[derive(Enum, Debug, Copy, Clone, Eq, PartialEq)]
pub enum Gender {
    Male,
    Female,
    Other,
}

impl From<GenderType> for Gender {
    fn from(gender_type: GenderType) -> Self {
        match gender_type {
            GenderType::Male => Gender::Male,
            GenderType::Female => Gender::Female,
            GenderType::Other => Gender::Other,
        }
    }
}

/// 飼い主が知っている範囲だけ埋められる、ゆるい誕生日（年・月・日 すべて任意）。
#[derive(SimpleObject, Clone, Debug)]
pub struct Birthday {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

impl From<crate::entity::birthday::Model> for Birthday {
    fn from(value: crate::entity::birthday::Model) -> Self {
        Birthday {
            year: value.year,
            month: value.month,
            day: value.day,
        }
    }
}

/// 誕生日と基準日 `today` から満年齢（年のみ）を計算する。
///
/// - `year` が不明なら `None`。
/// - `month` / `day` の不明な部分・範囲外の値（`month` が 1..=12 外、`day` が 1..=31 外）は
///   「最も早い日付（1月 / 1日）」として扱う ＝ 不明はつねに同じ向きに丸める。
/// - その月に存在しない日（例: 2/30）はその月の 1 日に切り詰める。
/// - 誕生日が `today` より未来なら `None`。
fn calculate_age(birthday: &Birthday, today: chrono::NaiveDate) -> Option<i32> {
    let year = birthday.year?;
    let month = birthday.month.filter(|m| (1..=12).contains(m)).unwrap_or(1) as u32;
    let day = birthday.day.filter(|d| (1..=31).contains(d)).unwrap_or(1) as u32;
    let birth = chrono::NaiveDate::from_ymd_opt(year, month, day)
        .or_else(|| chrono::NaiveDate::from_ymd_opt(year, month, 1))?;
    let mut age = today.year() - birth.year();
    if (today.month(), today.day()) < (birth.month(), birth.day()) {
        age -= 1;
    }
    (age >= 0).then_some(age)
}

#[derive(SimpleObject, Clone, Debug)]
#[graphql(complex)]
pub struct Dog {
    pub id: uuid::Uuid,
    pub name: String,
    pub breed: Option<String>,
    pub gender: Gender,
    pub avatar: Option<Url>,
    pub birthday: Option<Birthday>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[ComplexObject]
impl Dog {
    /// 登録された誕生日から計算した満年齢（年のみ）。誕生日（または年）が不明なら `null`。
    /// 基準日は UTC の今日。
    async fn age(&self) -> Option<i32> {
        calculate_age(self.birthday.as_ref()?, chrono::Utc::now().date_naive())
    }

    async fn walk_goal(&self, ctx: &Context<'_>) -> Result<Option<DogWalkGoal>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let goal = dog_walk_goal::Entity::find()
            .filter(dog_walk_goal::Column::DogId.eq(self.id))
            .filter(dog_walk_goal::Column::EffectiveTo.is_null())
            .one(db)
            .await
            .map_err(|e| AppError::InternalServerError(e.to_string()))?;
        Ok(goal.map(DogWalkGoal::from))
    }

    async fn walks(
        &self,
        ctx: &Context<'_>,
        after: Option<String>,
        before: Option<String>,
        first: Option<i32>,
        last: Option<i32>,
    ) -> Result<Connection<UuidCursor, Walk, WalkConnectionFields, EmptyFields>> {
        let db = ctx.data::<sea_orm::DatabaseConnection>().unwrap();
        let user = ctx.data::<user::Model>().unwrap();
        query(
            after,
            before,
            first,
            last,
            |after: Option<UuidCursor>, before: Option<UuidCursor>, first, last| async move {
                let mut query = walk::Entity::find()
                    .filter(walk::Column::UserId.eq(user.id))
                    .has_related(walk_dog::Entity, walk_dog::Column::DogId.eq(self.id));
                let (total_count, total_distance, total_duration) =
                    walk::Entity::aggregate(db, query.clone()).await?;
                let has_after = after.is_some();
                let has_before = before.is_some();
                query = query.order_by(walk::Column::Id, sea_orm::Order::Desc);
                if let Some(after) = after {
                    query = query.filter(walk::Column::Id.lt(after.id));
                }
                if let Some(before) = before {
                    query = query.filter(walk::Column::Id.gt(before.id));
                }
                let mut has_previous = has_after;
                let mut has_next = has_before;
                let mut walks = query.all(db).await?;
                if let Some(first) = first {
                    if walks.len() > first {
                        has_next = true;
                    }
                    walks.truncate(first);
                }
                if let Some(last) = last {
                    if walks.len() > last {
                        has_previous = true;
                    }
                    walks = walks.split_off(walks.len().saturating_sub(last));
                }
                let mut connection = Connection::with_additional_fields(
                    has_previous,
                    has_next,
                    WalkConnectionFields {
                        total_count,
                        total_distance,
                        total_duration,
                    },
                );
                connection.edges.extend(
                    walks
                        .into_iter()
                        .map(|walk| Edge::new(UuidCursor { id: walk.id }, Walk::from(walk))),
                );
                Ok::<_, async_graphql::Error>(connection)
            },
        )
        .await
    }
}

impl From<crate::entity::dog::Model> for Dog {
    fn from(model: crate::entity::dog::Model) -> Self {
        Dog {
            id: model.id,
            name: model.name,
            breed: model.breed,
            gender: model.gender.into(),
            avatar: avatar_url(model.avatar.as_deref()),
            birthday: model.birthday.map(Into::into),
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Birthday, calculate_age};
    use chrono::NaiveDate;

    fn birthday(year: Option<i32>, month: Option<i32>, day: Option<i32>) -> Birthday {
        Birthday { year, month, day }
    }

    /// 基準日は 2026-05-10 固定。
    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 5, 10).unwrap()
    }

    #[test]
    fn year_unknown_is_none() {
        assert_eq!(calculate_age(&birthday(None, None, None), today()), None);
        assert_eq!(
            calculate_age(&birthday(None, Some(3), Some(4)), today()),
            None
        );
    }

    #[test]
    fn year_only_treats_missing_parts_as_january_first() {
        // 2020-01-01 → 2026-05-10 は満 6 歳。
        assert_eq!(
            calculate_age(&birthday(Some(2020), None, None), today()),
            Some(6)
        );
    }

    #[test]
    fn birthday_month_not_yet_reached_this_year() {
        // 2020-08-01: 2026 年 5 月の時点で 8 月はまだ来ていない → 満 5 歳。
        assert_eq!(
            calculate_age(&birthday(Some(2020), Some(8), None), today()),
            Some(5)
        );
    }

    #[test]
    fn boundary_on_and_before_birthday() {
        // 2020-05-10 生まれ → 2026-05-10 にちょうど満 6 歳。
        assert_eq!(
            calculate_age(&birthday(Some(2020), Some(5), Some(10)), today()),
            Some(6)
        );
        // 2020-05-11 生まれ → 2026-05-10 はまだ満 5 歳（誕生日前日）。
        assert_eq!(
            calculate_age(&birthday(Some(2020), Some(5), Some(11)), today()),
            Some(5)
        );
    }

    #[test]
    fn newborn_is_zero() {
        assert_eq!(
            calculate_age(&birthday(Some(2026), Some(1), Some(1)), today()),
            Some(0)
        );
    }

    #[test]
    fn future_birthday_is_none() {
        assert_eq!(
            calculate_age(&birthday(Some(2030), Some(1), Some(1)), today()),
            None
        );
        // 同じ年でも基準日より後 → まだ生まれていない → None。
        assert_eq!(
            calculate_age(&birthday(Some(2026), Some(12), Some(31)), today()),
            None
        );
    }

    #[test]
    fn out_of_range_month_or_day_treated_as_january_first() {
        // month 13 / 0、day 40 / 0 はいずれも {2020, None, None} と同じ扱い → 満 6 歳。
        assert_eq!(
            calculate_age(&birthday(Some(2020), Some(13), Some(40)), today()),
            Some(6)
        );
        assert_eq!(
            calculate_age(&birthday(Some(2020), Some(0), Some(0)), today()),
            Some(6)
        );
    }

    #[test]
    fn day_not_valid_for_month_falls_back_to_first_of_month() {
        // 2024-02-30 は存在しない → 2024-02-01 として扱う → 2026-05-10 で満 2 歳。
        assert_eq!(
            calculate_age(&birthday(Some(2024), Some(2), Some(30)), today()),
            Some(2)
        );
    }
}
