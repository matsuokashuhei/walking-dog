# Use Case: Register Dog

`DOG-020`: authenticated Userは必須name/genderとoptional profile/goalでDogを一つ作成できます。

1. User statusをIdentity Directoryで確認します。
2. avatar指定時はMedia Catalogでowner、purpose、readyを確認します。
3. Dogとowner roleを同じtransactionで作ります。
4. goal指定時は同transactionで最初のgoalを作ります。
5. `DogRegistered v1`と必要な`DogWalkGoalChanged v1`をOutboxへ追加します。

同名Dogを許可し、DogIdで区別します。request ID再送は同じDogを返します。
