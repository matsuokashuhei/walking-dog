import { Stack } from 'expo-router';

// User 配下の画面は design.html の inline nav を画面内で描画します。
export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="change-email" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
