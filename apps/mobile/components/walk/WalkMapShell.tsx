import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';

interface WalkMapShellProps {
  map: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
}

// マップを全面に敷き、上部チップと下部パネルをセーフエリア込みで重ねます。
export function WalkMapShell({ map, top, bottom }: WalkMapShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {map}

      {/* 上部オーバーレイはステータスバーに重ならない位置へ逃がします。 */}
      {top ? (
        <View style={[styles.topOverlay, { top: insets.top + spacing.xs }]}>{top}</View>
      ) : null}

      {/* 下部オーバーレイはホームインジケータ分の余白を最低限確保します。 */}
      {bottom ? (
        <View
          style={[
            styles.bottomOverlay,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {bottom}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
});
