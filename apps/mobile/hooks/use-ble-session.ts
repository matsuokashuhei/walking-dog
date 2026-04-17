import { useCallback, useRef } from 'react';
import { startAdvertising, startScanning, type BleScanner } from '@/lib/ble/scanner';

interface BleAdvertiser {
  stop: () => void;
}

export function useBleSession() {
  const scannerRef = useRef<BleScanner | null>(null);
  const advertiserRef = useRef<BleAdvertiser | null>(null);

  const start = useCallback(
    async (walkId: string, onDetected: (detectedWalkId: string) => void) => {
      const s = await startScanning(onDetected);
      const a = await startAdvertising(walkId);
      scannerRef.current = s;
      advertiserRef.current = a;
    },
    [],
  );

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    advertiserRef.current?.stop();
    advertiserRef.current = null;
  }, []);

  return { start, stop };
}
