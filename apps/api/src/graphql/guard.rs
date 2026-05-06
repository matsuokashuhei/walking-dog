use async_graphql::{Context, Guard, Result};
use tracing::info;

use crate::entity::user;

pub struct AuthGuard;

// impl AuthGuard {
//     pub fn new() -> Self {
//         AuthGuard
//     }
// }

impl Guard for AuthGuard {
    async fn check(&self, ctx: &Context<'_>) -> Result<()> {
        info!("Checking authentication guard");
        match ctx.data::<user::Model>() {
            Ok(user) => {
                info!("Authenticated user: {:?}", user.id);
                Ok(())
            }
            Err(_) => {
                info!("No authenticated user found");
                Err("Unauthorized".into())
            }
        }
    }

    //     if let Ok(user) = ctx.data::<user::Model>() {
    //         info!("Authenticated user: {:?}", user.id);
    //         Ok(())
    //     } else {
    //         Err("Unauthorized".into())
    //     }
    // }
}
