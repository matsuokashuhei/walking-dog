import { useEffect, useState } from 'react';

interface UseWalkElapsedOptions {
  startedAt: Date | null;
}

// 散歩開始時刻からの経過秒数を、1 秒ごとに更新します。
export function useWalkElapsed({ startedAt }: UseWalkElapsedOptions) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSec(0);
      return;
    }

    const tick = () => {
      const elapsedMs = Date.now() - startedAt.getTime();
      setElapsedSec(Math.max(0, Math.floor(elapsedMs / 1000)));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  return elapsedSec;
}
