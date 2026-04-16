#[allow(unused)]
mod support;

#[tokio::test]
async fn test_health_endpoint() {
    let client = support::test_client().await;
    let res = client.get("/health").send().await.unwrap();
    assert_eq!(res.status(), 200);
    assert_eq!(res.text().await.unwrap(), "ok");
}
