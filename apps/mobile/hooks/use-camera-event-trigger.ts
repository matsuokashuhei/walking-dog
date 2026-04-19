import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

interface UseCameraEventTriggerArgs {
  cameraRequestedAt: number | null;
  walkId: string | null;
  dogId?: string;
  clearCameraRequest: () => void;
  triggerPhoto: (dogId?: string) => void | Promise<void>;
}

export function useCameraEventTrigger({
  cameraRequestedAt,
  walkId,
  dogId,
  clearCameraRequest,
  triggerPhoto,
}: UseCameraEventTriggerArgs) {
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
