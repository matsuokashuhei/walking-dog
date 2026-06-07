import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useWalkStore } from '@/stores/walk-store';
import { components, elevation, radius, spacing } from '@/theme/tokens';
import { WalkControls } from './WalkControls';
import { WalkEventActions } from './WalkEventActions';
import { WalkMinimizedControls } from './WalkMinimizedControls';
import type { Dog } from '@/types/graphql';

interface WalkRecordingControlsOverlayProps {
  dogs: Dog[];
}

// マップ上に直接重ねる記録操作パネル。native form sheet ではなく、expanded と minimized を同じ
// overlay 内で切り替えることで、畳み状態に空の sheet 背景が残らないようにします。
export function WalkRecordingControlsOverlay({ dogs }: WalkRecordingControlsOverlayProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const isMinimized = useWalkStore((s) => s.isMinimized);
  const setMinimized = useWalkStore((s) => s.setMinimized);
  const walkSession = useWalkSession();
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);
    try {
      await walkSession.stop(walkId);
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, walkSession, t]);

  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(100)}
      layout={LinearTransition.duration(180)}
      style={styles.root}
      testID="walk-recording-floating-controls"
    >
      {isMinimized ? (
        <View testID="walk-recording-floating-controls-minimized">
          <WalkMinimizedControls dogs={dogs} onExpand={() => setMinimized(false)} />
        </View>
      ) : (
        <View
          style={[
            styles.expandedPanel,
            {
              backgroundColor: theme.material,
              borderColor: theme.border,
            },
            elevation.mid,
          ]}
          testID="walk-recording-floating-controls-expanded"
        >
          <WalkControls
            dogs={dogs}
            onStop={handleStop}
            isStopping={isStopping}
            onMinimize={() => setMinimized(true)}
          >
            <WalkEventActions dogs={dogs} />
          </WalkControls>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  expandedPanel: {
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: components.walkControls.panelPaddingBottom,
    overflow: 'hidden',
  },
});
