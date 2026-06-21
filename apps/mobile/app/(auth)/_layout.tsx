import { Stack } from 'expo-router';

// 認証画面群は独立した Stack として、アプリ本体のタブ UI を表示しません。
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        headerShown: false,
      }}
    />
  );
}
