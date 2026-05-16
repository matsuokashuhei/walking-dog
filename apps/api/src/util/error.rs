pub fn format_error_chain<E>(error: &E) -> String
where
    E: std::error::Error + ?Sized,
{
    let mut chain = error.to_string();
    let mut source = error.source();
    while let Some(error) = source {
        chain.push_str(": ");
        chain.push_str(&error.to_string());
        source = error.source();
    }
    chain
}

#[cfg(test)]
mod tests {
    #[test]
    fn format_error_chain_walks_full_source_chain() {
        #[derive(Debug)]
        struct Inner;

        impl std::fmt::Display for Inner {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "ThrottlingException")
            }
        }

        impl std::error::Error for Inner {}

        #[derive(Debug)]
        struct Middle(Inner);

        impl std::fmt::Display for Middle {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "SendMessage failed")
            }
        }

        impl std::error::Error for Middle {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }

        #[derive(Debug)]
        struct Outer(Middle);

        impl std::fmt::Display for Outer {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "enqueue_track_point error")
            }
        }

        impl std::error::Error for Outer {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }

        assert_eq!(
            super::format_error_chain(&Outer(Middle(Inner))),
            "enqueue_track_point error: SendMessage failed: ThrottlingException"
        );
    }
}
