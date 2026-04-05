import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function DogDetailLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('dogs.detail.title'),
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dogs.list.title')}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="edit" options={{ title: t('dogs.edit.title') }} />
      <Stack.Screen name="members" options={{ title: t('dogs.members.title') }} />
    </Stack>
  );
}
