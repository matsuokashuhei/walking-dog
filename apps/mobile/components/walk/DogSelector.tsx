import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import type { Dog } from '@/types/graphql';

interface DogSelectorProps {
  onStart: () => void;
  isStarting: boolean;
}

export function DogSelector({ onStart, isStarting }: DogSelectorProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: me } = useMe();
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const dogs = me?.dogs ?? [];

  const renderDog = ({ item }: { item: Dog }) => {
    const isSelected = selectedDogIds.includes(item.id);
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={item.name}
        accessibilityState={{ checked: isSelected }}
        onPress={() => selectDog(item.id)}
        style={[
          styles.dogItem,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <Image
          source={item.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.dogPhoto}
          contentFit="cover"
        />
        <View style={styles.dogInfo}>
          <Text style={[styles.dogName, { color: colors.text }]}>{item.name}</Text>
          {item.breed ? (
            <Text style={[styles.dogBreed, { color: colors.textSecondary }]}>{item.breed}</Text>
          ) : null}
        </View>
        {isSelected ? (
          <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.ready.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('walk.ready.subtitle')}
      </Text>

      {dogs.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('walk.ready.noDogs')}
        </Text>
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          renderItem={renderDog}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.ready.start')}
        onPress={onStart}
        disabled={selectedDogIds.length === 0 || isStarting}
        style={[
          styles.startButton,
          {
            backgroundColor: selectedDogIds.length > 0 ? colors.primary : colors.border,
            opacity: isStarting ? 0.7 : 1,
          },
        ]}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>{t('walk.ready.start')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { ...typography.h2, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingTop: spacing.lg },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  dogPhoto: { width: 48, height: 48, borderRadius: radius.full },
  dogInfo: { marginLeft: spacing.md, flex: 1 },
  dogName: { ...typography.bodyMedium },
  dogBreed: { ...typography.caption, marginTop: spacing.xs },
  startButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  startButtonText: { ...typography.button, color: '#fff' },
});
