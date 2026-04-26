import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { spacing, typography } from '@/theme/tokens';

interface DogHeroNavBarProps {
  dogId: string;
  isOwner: boolean;
}

// Hero overlay text always renders on the photo hero (photo, not surface),
// so colors are intentionally hard-coded white rather than themed.
const HERO_OVERLAY_TEXT = {
  color: '#ffffff',
  textShadowColor: 'rgba(0,0,0,0.3)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

const NAV_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export function DogHeroNavBar({ dogId, isOwner }: DogHeroNavBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // System Stack header is disabled, so the back button must guard against
  // empty navigation history (deep-link / cold-start entry would softlock).
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dogs');
    }
  };
  return (
    <View style={[styles.bar, { top: insets.top }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dogs.detail.back')}
        onPress={handleBack}
        hitSlop={NAV_HIT_SLOP}
        style={styles.backRow}
      >
        <IconSymbol name="chevron.backward" size={20} color="#ffffff" weight="medium" />
        <Text style={styles.back}>{t('dogs.detail.back')}</Text>
      </Pressable>
      {isOwner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.detail.edit')}
          onPress={() => router.push({ pathname: '/dogs/[id]/edit', params: { id: dogId } })}
          hitSlop={NAV_HIT_SLOP}
        >
          <Text style={styles.edit}>{t('dogs.detail.edit')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  back: {
    ...typography.body,
    fontWeight: '500',
    ...HERO_OVERLAY_TEXT,
  },
  edit: {
    ...typography.body,
    ...HERO_OVERLAY_TEXT,
  },
});
