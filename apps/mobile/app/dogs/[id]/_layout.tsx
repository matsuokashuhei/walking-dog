import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';

// 犬詳細配下の編集、メンバー、友達、遭遇履歴 route のヘッダー設定を集約します。
export default function DogDetailLayout() {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
