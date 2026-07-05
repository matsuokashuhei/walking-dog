import { Stack } from 'expo-router';

// Dog detail owns its edit child while each screen draws its own inline chrome.
export default function DogDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
