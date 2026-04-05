import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogListSectionProps {
  dogs: Dog[];
}

export function DogListSection({ dogs }: DogListSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.onSurfaceVariant }]}>
        {t('settings.dogs').toUpperCase()}
      </Text>
      {dogs.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
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
                borderBottomColor: theme.border + '33',
              },
            ]}
          >
            <View style={[styles.dogIcon, { backgroundColor: theme.surfaceContainer }]}>
              <Text style={styles.dogEmoji}>&#128021;</Text>
            </View>
            <View style={styles.dogInfo}>
              <Text style={[styles.dogName, { color: theme.onSurface }]}>{dog.name}</Text>
              {dog.breed && (
                <Text style={[styles.dogBreed, { color: theme.onSurfaceVariant }]}>
                  {dog.breed}
                </Text>
              )}
            </View>
            <Text style={[styles.chevron, { color: theme.onSurfaceVariant }]}>&#8250;</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.md,
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
