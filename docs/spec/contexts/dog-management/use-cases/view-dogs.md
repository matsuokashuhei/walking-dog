# Use Case: View Dogs

`DOG-021`: Userはactive roleを持つDogをname、profile、avatarとともに一覧・詳細表示できます。

一覧はrole作成順、DogIdのstable orderを基本とし、removed Dogを除外します。Goal progressとwalk statsはHistory Queriesから画面合成し、Dog Directory responseへ埋め込みません。

他Userだけがroleを持つDog、unknown ID、removed Dogは`DOG_NOT_FOUND`として存在を漏らしません。
