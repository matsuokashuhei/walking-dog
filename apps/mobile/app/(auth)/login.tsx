import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Walking Dog</ThemedText>
        <ThemedText style={styles.subtitle}>
          散歩の記録と犬の友情を大切に
        </ThemedText>
      </View>
      <LoginForm
        onSuccess={() => {
          // Navigation guard in _layout.tsx handles redirect to (tabs)
        }}
        onRegisterPress={() => router.push('/(auth)/register' as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
