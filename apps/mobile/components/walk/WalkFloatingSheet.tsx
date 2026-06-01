import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { elevation, spacing } from '@/theme/tokens';

interface WalkFloatingSheetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Walk 画面の下部シート外枠。開始前後でこの外枠は維持し、中身だけ差し替えます。
export function WalkFloatingSheet({ children, style }: WalkFloatingSheetProps) {
  const theme = useColors();

  return (
    <GroupedCard
      style={[
        styles.card,
        { backgroundColor: theme.material, borderColor: theme.border },
        elevation.mid,
        style,
      ]}
    >
      <View style={[styles.grabber, { backgroundColor: theme.textDisabled }]} />
      {children}
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: spacing.step6 / 2,
    alignSelf: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
});
