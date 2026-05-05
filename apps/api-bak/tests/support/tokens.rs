/// Helper to make GraphQL requests as a specific user.
/// The Bearer token value is used as the cognito_sub via NoOpJwtVerifier.
/// "test-token" maps to the default "test-user-cognito-sub" user.
pub struct UserToken(pub &'static str);

pub const USER_A: UserToken = UserToken("test-token");
pub const USER_B: UserToken = UserToken("test-user-b-cognito-sub");
