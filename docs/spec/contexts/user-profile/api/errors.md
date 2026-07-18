# User Profile Errors

| Code | Meaning |
| --- | --- |
| `PROFILE_NOT_FOUND` | registration projection has not created profile |
| `INVALID_DISPLAY_NAME` | normalized name violates length/content |
| `MEDIA_NOT_READY` | avatar asset is unavailable or wrong purpose |
| `VERSION_CONFLICT` | profile/preferences changed concurrently |
| `IDENTITY_DISABLED` | User cannot mutate profile |
| `DEPENDENCY_UNAVAILABLE` | required Identity/Media contract unavailable |

dependency failureをvalidation errorや空値へ変換しません。
