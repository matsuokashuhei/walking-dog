use testcontainers::GenericImage;

const POSTGRES_NAME: &str = "postgres";
const POSTGRES_TAG: &str =
    "16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";

pub(crate) fn postgres() -> GenericImage {
    GenericImage::new(POSTGRES_NAME, POSTGRES_TAG)
}
