import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DogsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: t('dogs.new.title') }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
