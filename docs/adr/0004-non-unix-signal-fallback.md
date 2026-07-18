# Retain the non-Unix shutdown fallback temporarily

The API bootstrap exposes one shutdown function on Unix and non-Unix targets.
The non-Unix `ctrl_c` implementation is conditionally selected because Tokio’s
Unix `SIGTERM` API is unavailable there. Removing the fallback would silently
reduce the stated portability of the public bootstrap API.

This exact `cfg` exception is limited to 30 days and issue #387. The follow-up
must introduce a portable signal boundary or narrow the supported-target claim.
