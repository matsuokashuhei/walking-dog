import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { components, elevation, radius, spacing, typography } from '@/theme/tokens';

interface WalkEndSlideControlProps {
  disabled: boolean;
  loading: boolean;
  onConfirm: () => void;
}

export function WalkEndSlideControl({
  disabled,
  loading,
  onConfirm,
}: WalkEndSlideControlProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const translateX = useMemo(() => new Animated.Value(0), []);
  const [trackWidth, setTrackWidth] = useState(0);

  const maxTravel = Math.max(
    0,
    trackWidth -
      components.walkEndSlider.thumbSize -
      components.walkEndSlider.trackPadding * 2,
  );
  const label = t('walk.recording.slideToEndWalk');

  const animateThumb = useCallback(
    (toValue: number, duration: number = components.walkEndSlider.resetDurationMs) => {
      Animated.timing(translateX, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [translateX],
  );

  const resetThumb = useCallback(() => {
    animateThumb(0);
  }, [animateThumb]);

  useEffect(() => {
    if (disabled) {
      resetThumb();
    }
  }, [disabled, resetThumb]);

  const askForConfirmation = useCallback(() => {
    Alert.alert(
      t('walk.recording.endWalkConfirmTitle'),
      undefined,
      [
        {
          text: t('common.action.cancel'),
          style: 'cancel',
          onPress: resetThumb,
        },
        {
          text: t('walk.recording.endWalk'),
          style: 'destructive',
          onPress: () => {
            resetThumb();
            onConfirm();
          },
        },
      ],
      { cancelable: true, onDismiss: resetThumb },
    );
  }, [onConfirm, resetThumb, t]);

  const completeSlide = useCallback(() => {
    animateThumb(maxTravel, components.walkEndSlider.completeDurationMs);
    askForConfirmation();
  }, [animateThumb, askForConfirmation, maxTravel]);

  const moveThumb = useCallback(
    (dx: number) => {
      translateX.setValue(clamp(dx, 0, maxTravel));
    },
    [maxTravel, translateX],
  );

  const releaseThumb = useCallback(
    (dx: number) => {
      const releaseX = clamp(dx, 0, maxTravel);
      if (
        maxTravel > 0 &&
        releaseX >= maxTravel * components.walkEndSlider.completionThreshold
      ) {
        completeSlide();
        return;
      }
      resetThumb();
    },
    [completeSlide, maxTravel, resetThumb],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && maxTravel > 0,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled &&
          maxTravel > 0 &&
          Math.abs(gestureState.dx) > spacing.xs &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          if (!disabled) {
            moveThumb(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!disabled) {
            releaseThumb(gestureState.dx);
          }
        },
        onPanResponderTerminate: resetThumb,
        onShouldBlockNativeResponder: () => true,
      }),
    [disabled, maxTravel, moveThumb, releaseThumb, resetThumb, translateX],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          backgroundColor: theme.surfaceContainer,
          opacity: disabled ? components.walkEndSlider.disabledOpacity : 1,
        },
      ]}
      testID="walk-end-slide-control"
    >
      <Text
        numberOfLines={1}
        style={[styles.label, { color: theme.onSurfaceVariant }]}
      >
        {label}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          { backgroundColor: theme.error, transform: [{ translateX }] },
          elevation.low,
        ]}
        testID="walk-end-slide-thumb"
      >
        {loading ? (
          <ActivityIndicator color={theme.onInteractive} size="small" />
        ) : (
          <IconSymbol
            name="power"
            size={components.walkEndSlider.thumbIconSize}
            color={theme.onInteractive}
            weight="semibold"
          />
        )}
      </Animated.View>
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  track: {
    height: components.walkEndSlider.height,
    borderRadius: radius.pill,
    justifyContent: 'center',
    padding: components.walkEndSlider.trackPadding,
    overflow: 'hidden',
  },
  label: {
    ...typography.subheadline,
    fontWeight: typography.headline.fontWeight,
    textAlign: 'center',
    paddingHorizontal:
      components.walkEndSlider.thumbSize + components.walkEndSlider.labelSidePadding,
  },
  thumb: {
    position: 'absolute',
    left: components.walkEndSlider.trackPadding,
    width: components.walkEndSlider.thumbSize,
    height: components.walkEndSlider.thumbSize,
    borderRadius: components.walkEndSlider.thumbSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
