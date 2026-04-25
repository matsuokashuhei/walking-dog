import { useEffect, useRef, useState } from 'react';

interface UseWalkElapsedOptions {
  startedAt: Date | null;
  isPaused: boolean;
  totalPausedMs: number;
  pauseStartedAtMs?: number | null;
}

export function useWalkElapsed({
  startedAt,
  isPaused,
  totalPausedMs,
  pauseStartedAtMs,
}: UseWalkElapsedOptions) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      pausedAtRef.current = null;
      setElapsedSec(0);
      return;
    }

    if (isPaused) {
      pausedAtRef.current ??= pauseStartedAtMs ?? Date.now();
    } else {
      pausedAtRef.current = null;
    }

    const tick = () => {
      const currentTimeMs = isPaused
        ? pauseStartedAtMs ?? pausedAtRef.current ?? Date.now()
        : Date.now();
      const elapsedMs = currentTimeMs - startedAt.getTime() - totalPausedMs;
      setElapsedSec(Math.max(0, Math.floor(elapsedMs / 1000)));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt, isPaused, totalPausedMs, pauseStartedAtMs]);

  return elapsedSec;
}
