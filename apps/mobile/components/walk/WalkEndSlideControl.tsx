import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const maxTravel = getMaxTravel(trackWidth);
  const maxTravelRef = useRef(maxTravel);
  const label = t('walk.recording.slideToEndWalk');

  useEffect(() => {
    maxTravelRef.current = maxTravel;
  }, [maxTravel]);

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

  const completeSlide = useCallback((travel: number) => {
    animateThumb(travel, components.walkEndSlider.completeDurationMs);
    askForConfirmation();
  }, [animateThumb, askForConfirmation]);

  const moveThumb = useCallback(
    (dx: number) => {
      translateX.setValue(clamp(dx, 0, maxTravelRef.current));
    },
    [translateX],
  );

  const releaseThumb = useCallback(
    (dx: number) => {
      const travel = maxTravelRef.current;
      const releaseX = clamp(dx, 0, travel);
      if (
        travel > 0 &&
        releaseX >= travel * components.walkEndSlider.completionThreshold
      ) {
        completeSlide(travel);
        return;
      }
      resetThumb();
    },
    [completeSlide, resetThumb],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled &&
          Math.abs(gestureState.dx) > spacing.xs &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !disabled &&
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
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [disabled, moveThumb, releaseThumb, resetThumb, translateX],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    maxTravelRef.current = getMaxTravel(width);
    setTrackWidth(width);
  }, []);

  return (
    <View
      {...panResponder.panHandlers}
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

function getMaxTravel(trackWidth: number) {
  return Math.max(
    0,
    trackWidth -
      components.walkEndSlider.thumbSize -
      components.walkEndSlider.trackPadding * 2,
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
