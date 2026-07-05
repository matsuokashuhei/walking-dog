import { Stack } from 'expo-router';

// Walk tab owns the recording shell and saved walk detail screens.
export default function WalkLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="walks" />
    </Stack>
  );
}
