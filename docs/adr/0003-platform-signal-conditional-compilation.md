# Keep platform signal handling as an exact temporary exception

`api-bootstrap` must catch Unix `SIGTERM` so container shutdown remains graceful,
while non-Unix targets retain a compilable `ctrl_c` fallback. Rust exposes the
Unix signal API conditionally, so the two `cfg` attributes in
`shutdown.rs` cannot yet be replaced without either losing `SIGTERM` handling
or dropping portable compilation.

The architecture gate rejects conditional hiding by default. The two exact,
fingerprinted exceptions in `apps/api/architecture/exceptions.toml` are limited
to 30 days and issue #387. The follow-up must replace this platform split with
an explicit portable signal boundary or remove the non-Unix support claim.
