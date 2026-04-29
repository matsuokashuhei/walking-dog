import { Stack } from 'expo-router';

// 招待 route は deep link から直接開かれるため、ヘッダーなしの独立 Stack にします。
export default function InviteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
