import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export default function DogDetailLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('dogs.detail.title'),
          headerStyle: { backgroundColor: theme.background },
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dogs.list.title')}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <IconSymbol name="chevron.left" size={24} color={theme.onSurface} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('dogs.edit.title'),
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="members"
        options={{
          title: t('dogs.members.title'),
          headerStyle: { backgroundColor: theme.background },
        }}
      />
    </Stack>
  );
}
