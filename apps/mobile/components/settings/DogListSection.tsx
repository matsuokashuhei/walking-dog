import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogListSectionProps {
  dogs: Dog[];
}

export function DogListSection({ dogs }: DogListSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.dogs')}
      </Text>
      {dogs.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('settings.noDogs')}
        </Text>
      ) : (
        dogs.map((dog, index) => (
          <Pressable
            key={dog.id}
            accessibilityRole="button"
            accessibilityLabel={dog.name}
            onPress={() => router.push(`/dogs/${dog.id}`)}
            style={[
              styles.dogRow,
              index < dogs.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.dogIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.dogEmoji}>🐕</Text>
            </View>
            <View style={styles.dogInfo}>
              <Text style={[styles.dogName, { color: colors.text }]}>{dog.name}</Text>
              {dog.breed && (
                <Text style={[styles.dogBreed, { color: colors.textSecondary }]}>
                  {dog.breed}
                </Text>
              )}
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    ...typography.body,
  },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogEmoji: { fontSize: 18 },
  dogInfo: { marginLeft: 12, flex: 1 },
  dogName: { ...typography.bodyMedium },
  dogBreed: { ...typography.caption, marginTop: 2 },
  chevron: { fontSize: 18 },
});
