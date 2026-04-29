import { useCallback, useRef } from 'react';
import { startAdvertising, startScanning, type BleScanner } from '@/lib/ble/scanner';

interface BleAdvertiser {
  stop: () => void;
}

// 散歩中の BLE スキャンとアドバタイズのライフサイクルを管理します。
export function useBleSession() {
  const scannerRef = useRef<BleScanner | null>(null);
  const advertiserRef = useRef<BleAdvertiser | null>(null);

  const start = useCallback(
    async (walkId: string, onDetected: (detectedWalkId: string) => void) => {
      // 他の端末を探しながら、自分の散歩 ID も周囲へ広告します。
      const s = await startScanning(onDetected);
      const a = await startAdvertising(walkId);
      scannerRef.current = s;
      advertiserRef.current = a;
    },
    [],
  );

  // 画面終了や散歩終了時に、BLE リソースを確実に解放します。
  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    advertiserRef.current?.stop();
    advertiserRef.current = null;
  }, []);

  return { start, stop };
}
