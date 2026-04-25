import { useEffect, useRef, useState } from 'react';

interface UseWalkElapsedOptions {
  startedAt: Date | null;
  isPaused: boolean;
  totalPausedMs: number;
}

export function useWalkElapsed({
  startedAt,
  isPaused,
  totalPausedMs,
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
