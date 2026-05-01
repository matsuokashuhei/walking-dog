import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';

interface WalkControlsActionsProps {
  isPaused: boolean;
  isStopping: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}

// 記録中パネル下部の一時停止/再開と終了操作を表示します。
export function WalkControlsActions({
  isPaused,
  isStopping,
  onTogglePause,
  onStop,
}: WalkControlsActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <View style={styles.actionRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPaused ? t('walk.recording.resume') : t('walk.recording.pause')}
        accessibilityState={{ disabled: isStopping }}
        disabled={isStopping}
        onPress={onTogglePause}
        style={({ pressed }) => [
          styles.pauseButton,
          {
            backgroundColor: pressed
              ? theme.surfaceContainer
              : theme.surfaceContainer,
          },
          isStopping && styles.buttonDisabled,
        ]}
      >
        <Text style={[styles.pauseEmoji, { color: theme.onSurface }]}>
          {isPaused ? '▶' : '❚❚'}
        </Text>
        <Text style={[styles.pauseLabel, { color: theme.onSurface }]}>
          {isPaused ? t('walk.recording.resume') : t('walk.recording.pause')}
        </Text>
      </Pressable>
      <View style={styles.endButtonWrap}>
        <Button
          label={t('walk.recording.endWalk')}
          variant="destructive"
          onPress={onStop}
          disabled={isStopping}
          loading={isStopping}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.step6,
    flex: 1,
  },
  pauseEmoji: {
    ...typography.caption,
    fontWeight: typography.largeTitle.fontWeight,
  },
  pauseLabel: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  endButtonWrap: {
    flex: 1.2,
  },
});
