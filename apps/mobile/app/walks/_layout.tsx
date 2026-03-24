import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function WalksLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: t('walk.detail.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={[styles.backButton, { color: colors.primary }]}>
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
