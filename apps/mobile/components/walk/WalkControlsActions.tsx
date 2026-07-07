import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, typography } from '@/theme/tokens';

interface WalkControlsActionsProps {
  isStopping: boolean;
  onStop: () => void;
}

const SLIDE_MIN = 0;
const SLIDE_MAX = 1;
const SLIDE_COMPLETE_THRESHOLD = 0.95;

function clampSlideValue(value: number) {
  return Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, value));
}

function slideValueFromDrag(startX: number, locationX: number, width: number) {
  const knobTravel =
    width -
    components.walkControls.endSlideKnobSize -
    components.walkControls.endSlideKnobInset * 2;
  if (knobTravel <= 0) return SLIDE_MIN;
  return clampSlideValue((locationX - startX) / knobTravel);
}

// 記録中パネル下部の終了操作を、専用 responder で親マップへ横ドラッグを渡さず扱います。
export function WalkControlsActions({
  isStopping,
  onStop,
}: WalkControlsActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const [slideValue, setSlideValue] = useState(SLIDE_MIN);
  const [sliderWidth, setSliderWidth] = useState(0);
  const slideValueRef = useRef(SLIDE_MIN);
  const hasCompletedRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const wasStoppingRef = useRef(isStopping);

  const setSlidePosition = useCallback((value: number) => {
    const nextValue = clampSlideValue(value);
    slideValueRef.current = nextValue;
    setSlideValue(nextValue);
  }, []);

  const completeSlide = useCallback(() => {
    if (hasCompletedRef.current || isStopping) return;
    hasCompletedRef.current = true;
    setSlidePosition(SLIDE_MAX);
    onStop();
  }, [isStopping, onStop, setSlidePosition]);

  const handleSlidingComplete = useCallback(
    (value: number) => {
      if (isStopping) return;
      const nextValue = clampSlideValue(value);
      if (nextValue >= SLIDE_COMPLETE_THRESHOLD) {
        setSlidePosition(nextValue);
        completeSlide();
        return;
      }
      setSlidePosition(SLIDE_MIN);
    },
    [completeSlide, isStopping, setSlidePosition],
  );

  const setSlidePositionFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      if (isStopping || hasCompletedRef.current) return;
      const dragStartX = dragStartXRef.current;
      if (dragStartX === null) return;
      const nextValue = slideValueFromDrag(dragStartX, event.nativeEvent.locationX, sliderWidth);
      if (nextValue > SLIDE_MIN) {
        hasDraggedRef.current = true;
      }
      setSlidePosition(nextValue);
    },
    [isStopping, setSlidePosition, sliderWidth],
  );

  const shouldSetSlideResponder = useCallback(
    () => !isStopping && !hasCompletedRef.current,
    [isStopping],
  );

  const handleResponderGrant = useCallback(
    (event: GestureResponderEvent) => {
      if (isStopping || hasCompletedRef.current) return;
      dragStartXRef.current = event.nativeEvent.locationX;
      hasDraggedRef.current = false;
      setSlidePosition(SLIDE_MIN);
    },
    [isStopping, setSlidePosition],
  );

  const handleResponderRelease = useCallback(() => {
    if (isStopping) return;
    dragStartXRef.current = null;
    if (!hasDraggedRef.current) {
      completeSlide();
      return;
    }
    handleSlidingComplete(slideValueRef.current);
  }, [completeSlide, handleSlidingComplete, isStopping]);

  const handleResponderTerminate = useCallback(() => {
    dragStartXRef.current = null;
    hasDraggedRef.current = false;
    if (hasCompletedRef.current) return;
    setSlidePosition(SLIDE_MIN);
  }, [setSlidePosition]);

  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName !== 'activate') return;
      completeSlide();
    },
    [completeSlide],
  );

  useEffect(() => {
    if (wasStoppingRef.current && !isStopping) {
      hasCompletedRef.current = false;
      setSlidePosition(SLIDE_MIN);
    }
    wasStoppingRef.current = isStopping;
  }, [isStopping, setSlidePosition]);

  const handleSliderLayout = useCallback((event: LayoutChangeEvent) => {
    setSliderWidth(event.nativeEvent.layout.width);
  }, []);

  const knobTravel =
    sliderWidth > 0
      ? sliderWidth -
        components.walkControls.endSlideKnobSize -
        components.walkControls.endSlideKnobInset * 2
      : 0;
  const knobOffset = slideValue * Math.max(knobTravel, 0);

  return (
    <View style={styles.actionRow}>
      <View
        accessible
        accessibilityActions={[{ name: 'activate', label: t('walk.recording.endWalk') }]}
        accessibilityLabel={t('walk.recording.endWalk')}
        accessibilityRole="button"
        accessibilityState={{ disabled: isStopping }}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={handleSliderLayout}
        onMoveShouldSetResponder={shouldSetSlideResponder}
        onResponderGrant={handleResponderGrant}
        onResponderMove={setSlidePositionFromEvent}
        onResponderRelease={handleResponderRelease}
        onResponderTerminate={handleResponderTerminate}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={shouldSetSlideResponder}
        style={styles.endSliderWrap}
        testID="walk-end-slide-responder"
      >
        <View
          pointerEvents="none"
          style={[
            styles.visualLayer,
            {
              backgroundColor: theme.surfaceContainer,
              opacity: isStopping ? components.walkControls.endSlideDisabledOpacity : 1,
            },
          ]}
          testID="walk-end-slider-visual"
        >
          <Text
            style={[
              styles.endLabel,
              {
                color: theme.onSurface,
                opacity: components.walkControls.endSlideLabelOpacity,
              },
            ]}
          >
            {t('walk.recording.endWalk')}
          </Text>
          <View
            style={[
              styles.knob,
              {
                backgroundColor: theme.surface,
                transform: [{ translateX: knobOffset }],
              },
            ]}
            testID="walk-end-slider-knob"
          >
            <Text style={[styles.knobIcon, { color: theme.error }]}>⏻</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    width: '100%',
  },
  endSliderWrap: {
    width: '100%',
    height: components.walkControls.endSlideHeight,
    position: 'relative',
  },
  visualLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: components.walkControls.endSlideHeight / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  endLabel: {
    ...typography.headline,
    fontWeight: typography.headline.fontWeight,
    textAlign: 'center',
  },
  knob: {
    position: 'absolute',
    left: components.walkControls.endSlideKnobInset,
    width: components.walkControls.endSlideKnobSize,
    height: components.walkControls.endSlideKnobSize,
    borderRadius: components.walkControls.endSlideKnobSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 3,
  },
  knobIcon: {
    fontSize: components.walkControls.endSlidePowerIconSize,
    lineHeight: components.walkControls.endSlidePowerIconSize + 4,
  },
});
