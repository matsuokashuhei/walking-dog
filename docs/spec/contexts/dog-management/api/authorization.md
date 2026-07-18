# Dog Management Authorization

- list/detailはactive `owner`または`walker` roleに許可します。
- registerはauthenticated active Userに許可し、作成者をownerにします。
- update/remove/set goalはownerだけに許可します。
- unauthorized IDはnot foundと同じ外部responseにします。
- service Directoryは認証されたWalk/History service identityだけが利用します。

