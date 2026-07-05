import { Stack } from 'expo-router';

// User 配下の画面は design.html の inline nav を画面内で描画します。
export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen name="edit" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
