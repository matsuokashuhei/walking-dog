import { useEffect, useState } from 'react';

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
  const [nowMs, setNowMs] = useState(() => Date.now());

  // 一時停止中は時刻を固定し、再開時にタイマー表示が進みすぎないようにします。
  useEffect(() => {
    if (!startedAt) {
      return;
    }

    if (isPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt, isPaused]);

  if (!startedAt) {
    return 0;
  }

  const elapsedMs = nowMs - startedAt.getTime() - totalPausedMs;
  return Math.max(0, Math.floor(elapsedMs / 1000));
}
