import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import type { Dog } from '@/types/graphql';

interface DogSelectorProps {
  dogs: Dog[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function DogSelector({ dogs, selectedIds, onToggle }: DogSelectorProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  if (dogs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('walk.noDogs')}
        </Text>
        <Button
          label={t('dogs.list.addDog')}
          variant="secondary"
          onPress={() => router.push('/dogs/new')}
          accessibilityLabel={t('dogs.list.addDog')}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('walk.selectDogs')}
      </Text>
      <FlatList
        data={dogs}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={item.name}
              accessibilityState={{ checked: selected }}
              onPress={() => onToggle(item.id)}
              style={[
                styles.dogItem,
                {
                  backgroundColor: selected ? colors.primaryLight : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.dogName, { color: colors.text }]}>
                {item.name}
              </Text>
              {item.breed && (
                <Text style={[styles.dogBreed, { color: colors.textSecondary }]}>
                  {item.breed}
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
  },
  label: {
    ...typography.bodyMedium,
    marginBottom: spacing.sm,
  },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dogName: {
    ...typography.bodyMedium,
    flex: 1,
  },
  dogBreed: {
    ...typography.caption,
  },
});
