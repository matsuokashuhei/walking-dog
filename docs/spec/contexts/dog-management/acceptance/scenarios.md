# Dog Management Acceptance Scenarios

- `DOG-A01`: 0 Dog時にempty stateを表示し、取得失敗と区別する。
- `DOG-A02`: name/gender必須でDogを登録し、同名Dogを別IDで保持する。
- `DOG-A03`: invalid/future/40年以上前birthdayを拒否する。
- `DOG-A04`: avatar permission/upload failure後もformを保持して再試行できる。
- `DOG-A05`: dirty Cancelで確認し、submit中Cancel/Saveを無効にする。
- `DOG-A06`: update成功後にlist/detailへ最新versionを表示する。
- `DOG-A07`: removed Dogをlist/detail/start-walk候補へ出さない。
- `DOG-A08`: owner以外はupdate/remove/goal変更できない。
- `DOG-A09`: daily/weekly minutes goalを保存し、期間重複を作らない。
- `DOG-A10`: Dog detailでHistory失敗を0 statsへ変換しない。
- `DOG-A11`: 同名DogをVoiceOver labelで区別できる。
- `DOG-A12`: 日本語・英語、Light・Dark、Dynamic Typeで主要操作へ到達できる。

