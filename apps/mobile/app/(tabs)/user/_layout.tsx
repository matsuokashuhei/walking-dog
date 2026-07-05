import { Stack } from 'expo-router';

// Me tab owns profile edit and settings so native back gestures stay inside the tab.
export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
