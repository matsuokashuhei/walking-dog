use axum::response::Html;

const TERMS_HTML: &str = include_str!("legal/terms.html");
const POLICY_HTML: &str = include_str!("legal/policy.html");

pub fn terms_html() -> &'static str {
    TERMS_HTML
}

pub fn policy_html() -> &'static str {
    POLICY_HTML
}

pub async fn terms() -> Html<&'static str> {
    Html(terms_html())
}

pub async fn policy() -> Html<&'static str> {
    Html(policy_html())
}
