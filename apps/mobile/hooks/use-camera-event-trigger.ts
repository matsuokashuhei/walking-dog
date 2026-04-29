import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

interface UseCameraEventTriggerArgs {
  cameraRequestedAt: number | null;
  walkId: string | null;
  dogId?: string;
  clearCameraRequest: () => void;
  triggerPhoto: (dogId?: string) => void | Promise<void>;
}

// 画面遷移で受け取ったカメラ起動要求を、アプリが active になってから実行します。
export function useCameraEventTrigger({
  cameraRequestedAt,
  walkId,
  dogId,
  clearCameraRequest,
  triggerPhoto,
}: UseCameraEventTriggerArgs) {
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // カメラ画面へ戻った直後の競合を避けるため、短い遅延を置いて写真操作を起動します。
  useEffect(() => {
    if (cameraTimerRef.current !== null) {
      clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }

    if (!cameraRequestedAt || !walkId) return;

    clearCameraRequest();

    const launchAfterDelay = () => {
      if (cameraTimerRef.current !== null) {
        clearTimeout(cameraTimerRef.current);
      }

      cameraTimerRef.current = setTimeout(() => {
        cameraTimerRef.current = null;
        void triggerPhoto(dogId);
      }, 150);
    };

    if (AppState.currentState === 'active') {
      launchAfterDelay();
      return () => {
        if (cameraTimerRef.current !== null) {
          clearTimeout(cameraTimerRef.current);
          cameraTimerRef.current = null;
        }
      };
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      subscription.remove();
      launchAfterDelay();
    });

    return () => {
      subscription.remove();
      if (cameraTimerRef.current !== null) {
        clearTimeout(cameraTimerRef.current);
        cameraTimerRef.current = null;
      }
    };
  }, [cameraRequestedAt, walkId, dogId, clearCameraRequest, triggerPhoto]);
}
