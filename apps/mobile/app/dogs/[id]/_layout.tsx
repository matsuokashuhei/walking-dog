import { Stack } from 'expo-router';

// 犬詳細配下の編集画面の Stack ヘッダー設定を集約します。
export default function DogDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
