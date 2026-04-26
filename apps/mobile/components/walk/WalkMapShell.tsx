import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';

interface WalkMapShellProps {
  map: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
}

export function WalkMapShell({ map, top, bottom }: WalkMapShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {map}

      {top ? (
        <View style={[styles.topOverlay, { top: insets.top + spacing.xs }]}>{top}</View>
      ) : null}

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
