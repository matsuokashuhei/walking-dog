# User Profile Data Invariants

- UserRegistered受信時にdefault profile/preferencesをidempotentに作成します。
- display nameとpreferences updateは同じProfile aggregate revisionを進めます。
- external MediaAsset deletion受信時、avatar referenceをnullへ変更してProfileUpdatedを発行します。
- locale、unit、appearanceはenum外の値を保存しません。
- updateとOutbox insertは同じtransactionです。
