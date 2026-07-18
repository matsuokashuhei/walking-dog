# Identity Frontend Routes

| Route | Auth state | Purpose |
| --- | --- | --- |
| `/(auth)/login` | unauthenticated | existing User sign-in |
| `/(auth)/signup` | unauthenticated | new User registration |
| `/settings/email` | authenticated | verified email change |

authenticated Userがauth routeを開いた場合はApp ShellのWalk tabへreplaceします。unauthenticated Userがprotected routeを開いた場合は元のdeep linkを保持してloginへreplaceします。
