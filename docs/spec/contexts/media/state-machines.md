# Media Asset State Machine

```text
pending_upload -> processing -> ready
pending_upload -> deleted
pending_upload -> expired -> deleted
processing -> rejected
processing -> deleted
ready -> deleted
```

`completeUpload`はobject存在とdeclared checksumを確認して`processing`へ進めます。decoder、content sniffing、pixel bounds、malware scan、normalizationが成功したときだけ`ready`です。

同じcompletion requestの再送は現在stateを返します。terminal stateから別terminal stateへ暗黙遷移しません。
