import { Stack } from 'expo-router';

// Dogs tab owns list, create, detail, and edit screens so native back gestures
// stay inside the tab instead of pushing onto the root Stack.
export default function DogsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
