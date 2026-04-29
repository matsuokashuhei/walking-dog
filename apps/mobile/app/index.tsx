import { Redirect } from 'expo-router';

// ルート URL はアプリのメイン導線である散歩タブへ集約します。
export default function Index() {
  return <Redirect href="/(tabs)/walk" />;
}
