# Media Acceptance Scenarios

- `MED-A01`: JPEG、PNG、HEICをpurpose limit内でuploadし、ready Assetを得る。
- `MED-A02`: size、checksum、file signatureが不一致ならreadyにしない。
- `MED-A03`: EXIF GPSを含むsourceからnormalized objectへGPSが残らない。
- `MED-A04`: upload grant期限切れ後にcompletionすると`UPLOAD_EXPIRED`になる。
- `MED-A05`: completion再送で新しいobjectやeventを作らない。
- `MED-A06`: 他UserはAsset metadata、delivery URL、存在を取得できない。
- `MED-A07`: deleted Assetは即時delivery不可となり、consumerはplaceholderへ切り替えられる。
- `MED-A08`: storage unavailableを0-byte成功やfallback URLに変換しない。
- `MED-A09`: avatarとwalk photoに異なるsize/dimension policyを適用する。
- `MED-A10`: object key、signed URL、checksumをevent/logへ出さない。
