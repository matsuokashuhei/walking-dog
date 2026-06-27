use sentry::integrations::tracing::EventFilter;
use tracing::Level;
use walking_dog::observability::sentry_event_filter;

#[test]
fn only_error_events_are_sent_to_sentry() {
    assert_eq!(
        sentry_event_filter(&Level::ERROR).bits(),
        EventFilter::Event.bits()
    );
    assert_eq!(
        sentry_event_filter(&Level::WARN).bits(),
        EventFilter::Ignore.bits()
    );
    assert_eq!(
        sentry_event_filter(&Level::INFO).bits(),
        EventFilter::Ignore.bits()
    );
    assert_eq!(
        sentry_event_filter(&Level::DEBUG).bits(),
        EventFilter::Ignore.bits()
    );
    assert_eq!(
        sentry_event_filter(&Level::TRACE).bits(),
        EventFilter::Ignore.bits()
    );
}
