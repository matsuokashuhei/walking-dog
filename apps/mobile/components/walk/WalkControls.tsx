import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useWalkElapsed } from '@/hooks/use-walk-elapsed';
import { components, spacing } from '@/theme/tokens';
import { useSettingsStore } from '@/stores/settings-store';
import { useWalkStore } from '@/stores/walk-store';
import { formatDistanceParts, formatPace, formatTime } from '@/lib/walk/format';
import { WalkControlsActions } from './WalkControlsActions';
import { WalkIdentityHeader } from './WalkIdentityHeader';
import { WalkMetricsRow } from './WalkMetricsRow';
import type { Dog } from '@/types/graphql';

interface WalkControlsProps {
  dogs: Dog[];
  onStop: () => void;
  isStopping: boolean;
  onMinimize?: () => void;
  /** Pee/Poo/Photo 操作は walk.tsx から <WalkEventActions /> として差し込みます。 */
  children?: ReactNode;
}

// 記録中の下部パネルとして、犬の表示、メトリクス、イベント操作、停止操作をまとめます。
export function WalkControls({
  dogs,
  onStop,
  isStopping,
  onMinimize,
  children,
}: WalkControlsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const units = useSettingsStore((s) => s.units);
  const elapsedSec = useWalkElapsed({ startedAt, isPaused: false, totalPausedMs: 0 });

  // 記録中パネルのメトリクスは、設定単位に合わせた表示文字列へ変換して渡します。
  const { value: distanceValue, unit: distanceUnit } = formatDistanceParts(totalDistanceM, units);
  const pace = formatPace(elapsedSec, totalDistanceM, units);
  const metrics = [
    { label: t('walk.recording.time'), value: formatTime(elapsedSec) },
    {
      label: t('walk.recording.distance'),
      value: distanceValue,
      unit: distanceUnit || undefined,
    },
    { label: t('walk.recording.pace'), value: pace.value, unit: pace.unit },
  ];

  const isSingleDog = dogs.length === 1;
  // 単独散歩では時間帯ラベル、複数犬ではグループ散歩ラベルを表示します。
  const title = isSingleDog ? dogs[0].name : dogs.map((d) => d.name).join(' + ');
  const subtitle = isSingleDog
    ? contextualWalkLabel(startedAt, t)
    : `${t('walk.recording.groupWalk')} · ${t('walk.recording.together')}`;

  return (
    <View style={styles.sheet}>
      <WalkIdentityHeader
        dogs={dogs}
        title={title}
        subtitle={subtitle}
        action={
          onMinimize ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('walk.recording.minimize')}
              onPress={onMinimize}
              style={({ pressed }) => [
                styles.minimizeButton,
                { backgroundColor: theme.surfaceContainer },
                pressed && styles.minimizeButtonPressed,
              ]}
            >
              <IconSymbol
                name="chevron.down"
                size={components.walkControls.minimizeIconSize}
                color={theme.onSurface}
              />
            </Pressable>
          ) : undefined
        }
      />
      <WalkMetricsRow metrics={metrics} />

      {children ? <View style={styles.slot}>{children}</View> : null}

      <WalkControlsActions
        isStopping={isStopping}
        onStop={onStop}
      />
    </View>
  );
}

function contextualWalkLabel(startedAt: Date | null, t: (key: string) => string) {
  // 散歩開始時刻を使って、朝・昼・夜の自然なラベルに切り替えます。
  const hour = (startedAt ?? new Date()).getHours();
  if (hour < 12) return t('walk.recording.morningWalk');
  if (hour < 18) return t('walk.recording.afternoonWalk');
  return t('walk.recording.eveningWalk');
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.md,
  },
  minimizeButton: {
    width: components.walkControls.minimizeButtonSize,
    height: components.walkControls.minimizeButtonSize,
    borderRadius: components.walkControls.minimizeButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizeButtonPressed: {
    opacity: 0.8,
  },
  slot: {
    marginBottom: spacing.md,
  },
});
