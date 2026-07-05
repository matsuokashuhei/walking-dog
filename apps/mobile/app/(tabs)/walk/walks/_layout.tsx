import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { useColors } from '@/hooks/use-colors';

// Saved walk detail belongs to the Walk tab stack.
export default function WalksLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: t('walk.detail.title'),
          headerStyle: { backgroundColor: theme.background },
          headerLeft: () => (
            <BackButton
              onPress={() => router.back()}
              color={theme.interactive}
            />
          ),
        }}
      />
    </Stack>
  );
}
