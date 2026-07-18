# Dog Management Data Invariants

- active Dogは少なくとも一つのactive owner roleを持ちます。
- 同じUserId/DogId/roleのactive rowは一つです。
- Dog removeとDogRemoved Outbox insertは同じtransactionです。
- goal rangeは同じDog内で重複しません。
- birthday validationはUser timezoneに依存せずcalendar dateで行います。
- DogId、createdAtはimmutableです。

