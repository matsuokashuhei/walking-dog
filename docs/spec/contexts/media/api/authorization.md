# Media Authorization

- end-user mutationはAsset ownerだけが実行できます。
- service callerはconsumerでの閲覧・変更認可を終えた後にMediaAssetIdを渡します。
- walk photoのviewer authorizationはHistory/Walk、dog avatarはDog、user avatarはUser Profileが所有します。
- Mediaは他context DBを読んでauthorizationを補完しません。
- IdentityでdisabledのUserへ新しいupload grantを発行しません。
