# Use Case: Update Dog

`DOG-022`: owner roleのUserはDog profileをexpected version付きで更新できます。

name、breed、gender、birthday、avatarを更新できます。変更なしinputはeventを発行しません。MediaDeleted受信時はavatar referenceをnullへ変更してDogUpdatedを発行します。

walker roleは閲覧だけで更新できません。
