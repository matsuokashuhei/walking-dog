import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalkElapsed } from '@/hooks/use-walk-elapsed';
import { spacing } from '@/theme/tokens';
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
  /** Pee/Poo/Photo 操作は walk.tsx から <WalkEventActions /> として差し込みます。 */
  children?: ReactNode;
}

interface PauseState {
  startedAtMs: number | null;
  isPaused: boolean;
  pausedAtMs: number | null;
  totalPausedMs: number;
}

function initialPauseState(startedAtMs: number | null): PauseState {
  return {
    startedAtMs,
    isPaused: false,
    pausedAtMs: null,
    totalPausedMs: 0,
  };
}

// 記録中の下部パネルとして、犬の表示、メトリクス、イベント操作、停止操作をまとめます。
export function WalkControls({ dogs, onStop, isStopping, children }: WalkControlsProps) {
  const { t } = useTranslation();
  const startedAt = useWalkStore((s) => s.startedAt);
  const startedAtMs = startedAt?.getTime() ?? null;
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const units = useSettingsStore((s) => s.units);

  const [pauseState, setPauseState] = useState(() => initialPauseState(startedAtMs));
  const activePauseState =
    pauseState.startedAtMs === startedAtMs ? pauseState : initialPauseState(startedAtMs);
  const { isPaused, totalPausedMs } = activePauseState;
  const elapsedSec = useWalkElapsed({ startedAt, isPaused, totalPausedMs });

  // 一時停止の開始時刻を state に残し、再開時に累計停止時間へ加算します。
  const togglePause = () => {
    const now = Date.now();
    setPauseState((previous) => {
      const current =
        previous.startedAtMs === startedAtMs ? previous : initialPauseState(startedAtMs);
      if (current.isPaused && current.pausedAtMs !== null) {
        return {
          ...current,
          isPaused: false,
          pausedAtMs: null,
          totalPausedMs: current.totalPausedMs + (now - current.pausedAtMs),
        };
      }
      return {
        ...current,
        isPaused: true,
        pausedAtMs: now,
      };
    });
  };

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
      <WalkIdentityHeader dogs={dogs} title={title} subtitle={subtitle} />
      <WalkMetricsRow metrics={metrics} />

      {children ? <View style={styles.slot}>{children}</View> : null}

      <WalkControlsActions
        isPaused={isPaused}
        isStopping={isStopping}
        onTogglePause={togglePause}
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
  slot: {
    marginBottom: spacing.md,
  },
});
