import { Stack } from 'expo-router';

// 犬詳細配下の編集、メンバー、友達、遭遇履歴 route のヘッダー設定を集約します。
export default function DogDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
      <Stack.Screen name="members" options={{ headerShown: false }} />
      <Stack.Screen name="friends/index" options={{ headerShown: false }} />
      {/* friends/[friendDogId] は Expo Router の自動検出に任せ、既定の Stack ヘッダー（戻るボタン付き）を使います。 */}
      <Stack.Screen name="encounters" options={{ headerShown: false }} />
    </Stack>
  );
}
