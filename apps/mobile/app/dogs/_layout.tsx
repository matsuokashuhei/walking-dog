import { Stack } from 'expo-router';

// 犬関連 route は新規登録と詳細配下の Stack をここで束ねます。
// 02b. Dog edit デザインに合わせて、各画面が自前で Cancel/Save の nav bar を描画する形にしたため
// Stack の標準 header はすべて非表示。
export default function DogsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="new"
        options={{ headerShown: false, animation: 'slide_from_bottom', animationDuration: 220 }}
      />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
