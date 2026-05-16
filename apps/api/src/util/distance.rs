use crate::entity::track_point;

const EARTH_RADIUS_M: f64 = 6_371_000.0;

pub fn haversine_meters(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let dphi = (lat2 - lat1).to_radians();
    let dlambda = (lng2 - lng1).to_radians();
    let a = (dphi / 2.0).sin().powi(2) + phi1.cos() * phi2.cos() * (dlambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    EARTH_RADIUS_M * c
}

pub fn cumulative_distance_meters(points: &[track_point::Model]) -> f64 {
    points
        .windows(2)
        .map(|w| haversine_meters(w[0].latitude, w[0].longitude, w[1].latitude, w[1].longitude))
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{DateTime, Utc};
    use uuid::Uuid;

    fn point(lat: f64, lng: f64, secs: i64) -> track_point::Model {
        track_point::Model {
            walk_id: Uuid::nil(),
            tracked_at: DateTime::<Utc>::from_timestamp(secs, 0).unwrap(),
            latitude: lat,
            longitude: lng,
        }
    }

    #[test]
    fn haversine_known_pair_tokyo_to_shinjuku() {
        // Tokyo Station ↔ Shinjuku Station ≈ 6.1km, 1% tolerance.
        let d = haversine_meters(35.6812, 139.7671, 35.6896, 139.7006);
        assert!((d - 6_100.0).abs() < 100.0, "expected ~6100m, got {d}");
    }

    #[test]
    fn haversine_same_point_is_zero() {
        let d = haversine_meters(35.6812, 139.7671, 35.6812, 139.7671);
        assert!(d.abs() < 1e-6);
    }

    #[test]
    fn cumulative_empty_is_zero() {
        let points: Vec<track_point::Model> = vec![];
        assert_eq!(cumulative_distance_meters(&points), 0.0);
    }

    #[test]
    fn cumulative_single_point_is_zero() {
        let points = vec![point(35.6812, 139.7671, 0)];
        assert_eq!(cumulative_distance_meters(&points), 0.0);
    }

    #[test]
    fn cumulative_multiple_points_sums_segments() {
        let p0 = point(35.6812, 139.7671, 0);
        let p1 = point(35.6896, 139.7006, 60);
        let p2 = point(35.6812, 139.7671, 120);
        let total = cumulative_distance_meters(&[p0, p1, p2]);
        // round-trip Tokyo → Shinjuku → Tokyo ≈ 12.2km.
        assert!(
            (total - 12_200.0).abs() < 200.0,
            "expected ~12200m, got {total}"
        );
    }
}
