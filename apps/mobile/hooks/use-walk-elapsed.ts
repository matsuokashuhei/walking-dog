import { useEffect, useRef, useState } from 'react';

interface UseWalkElapsedOptions {
  startedAt: Date | null;
  isPaused: boolean;
  totalPausedMs: number;
}

// 一時停止時間を差し引いた散歩の経過秒数を、1 秒ごとに更新します。
export function useWalkElapsed({
  startedAt,
  isPaused,
  totalPausedMs,
}: UseWalkElapsedOptions) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const pausedAtRef = useRef<number | null>(null);

  // 一時停止中は時刻を固定し、再開時にタイマー表示が進みすぎないようにします。
  useEffect(() => {
    if (!startedAt) {
      pausedAtRef.current = null;
      setElapsedSec(0);
      return;
    }

    if (isPaused) {
      pausedAtRef.current ??= Date.now();
    } else {
      pausedAtRef.current = null;
    }

    const tick = () => {
      const currentTimeMs = isPaused ? pausedAtRef.current ?? Date.now() : Date.now();
      const elapsedMs = currentTimeMs - startedAt.getTime() - totalPausedMs;
      setElapsedSec(Math.max(0, Math.floor(elapsedMs / 1000)));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt, isPaused, totalPausedMs]);

  return elapsedSec;
}
