import { Stack } from 'expo-router';

// Settings 配下のプロフィール画面は design.html の inline nav を画面内で描画します。
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile" />
    </Stack>
  );
}
