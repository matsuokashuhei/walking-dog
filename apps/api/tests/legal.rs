use walking_dog::legal::{policy_html, terms_html};

#[test]
fn legal_terms_page_contains_title_and_provisional_body() {
    let html = terms_html();

    assert!(html.contains("<!doctype html>"));
    assert!(html.contains("Walking Dog 利用規約"));
    assert!(html.contains("正式な本文を準備中"));
}

#[test]
fn legal_policy_page_contains_title_and_provisional_body() {
    let html = policy_html();

    assert!(html.contains("<!doctype html>"));
    assert!(html.contains("Walking Dog 個人情報保護方針"));
    assert!(html.contains("正式な本文を準備中"));
}
