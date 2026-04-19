import { Pressable, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';

export default function DogDetailLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: '#ffffff',
          headerBackTitle: t('dogs.detail.back'),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dogs.detail.edit')}
              onPress={() => id && router.push(`/dogs/${id}/edit`)}
              hitSlop={12}
            >
              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '400' }}>
                {t('dogs.detail.edit')}
              </Text>
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
      <Stack.Screen
        name="friends"
        options={{
          title: t('dogs.friends.title', 'Friends'),
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen
        name="encounters"
        options={{
          title: t('dogs.encounters.title', 'Encounter History'),
          headerStyle: { backgroundColor: theme.background },
        }}
      />
    </Stack>
  );
}
