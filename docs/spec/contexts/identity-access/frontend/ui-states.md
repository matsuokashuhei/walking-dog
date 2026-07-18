# Identity UI States

| State | Required UI |
| --- | --- |
| idle | editable email、primary action |
| invalid | field-level error、focus remains on field |
| requesting | primary action disabled、progress visible |
| challenge | OTP input、masked destination、resend timer |
| verifying | OTP input disabled、progress visible |
| rate-limited | retry time、no automatic resend loop |
| provider-unavailable | retry action、entered email retained |
| authenticated | route replacement、no duplicate transition |

Dynamic Type、VoiceOver、英語・日本語、Light・Darkでprimary action、error、destination、resend timeを識別できます。

