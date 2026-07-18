# Frontend Composition

## App Shell Contract

各frontend contextはroute ID、path、authentication requirement、deep-link pattern、screen factoryをApp Shellへ登録します。App Shellは表示順とnavigation containerを構成しますが、screen内部状態を所有しません。

## Feature State

server state、form state、permission state、active operation stateは所有context内に閉じます。横断状態は公開contractから得たimmutable snapshotとして扱います。

## Design System

Design Systemはcolor、spacing、typography、icons、surface、form controls、accessibility behaviorを提供します。犬選択、散歩開始可否、goal progressなどのdomain判断を持ちません。

## Registered Surfaces

- Identity & Access: login、signup、email change
- User Profile: Me、profile edit、settings
- Dog Management: dogs list、dog registration、dog detail、dog edit、walk goal
- Walk Session: walk ready、active walk、finish summary
- History & Insights: walk history、walk detail、stats
- Media: picker/upload states embedded in owner screens

