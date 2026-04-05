import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Text style={[styles.backButton, { color: theme.onSurface }]}>
                {'‹'}
              </Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    fontSize: 32,
    lineHeight: 36,
    paddingRight: 8,
  },
});
