import { Stack } from 'expo-router';

// 犬詳細配下の編集、遭遇履歴 route のヘッダー設定を集約します。
export default function DogDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="encounters" options={{ headerShown: false }} />
    </Stack>
  );
}
