import { Stack } from 'expo-router';

// Settings screens draw inline chrome, not the default Stack header.
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="email" />
    </Stack>
  );
}
