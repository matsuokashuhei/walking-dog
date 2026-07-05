import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, typography } from '@/theme/tokens';

interface WalkControlsActionsProps {
  isStopping: boolean;
  onStop: () => void;
}

const SLIDE_MIN = 0;
const SLIDE_MAX = 1;
const SLIDE_STEP = 0.01;
const SLIDE_COMPLETE_THRESHOLD = 0.95;
const TRANSPARENT_CONTROL_COLOR = '#00000000';
const SLIDE_THUMB_CENTER_OFFSET =
  components.walkControls.endSlideKnobInset +
  components.walkControls.endSlideKnobSize / 2;

function clampSlideValue(value: number) {
  return Math.min(SLIDE_MAX, Math.max(SLIDE_MIN, value));
}

// 記録中パネル下部の終了操作を、RN Slider の native gesture で扱います。
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

  const handleSlideChange = useCallback(
    (value: number) => {
      if (isStopping || hasCompletedRef.current) return;
      setSlidePosition(value);
    },
    [isStopping, setSlidePosition],
  );

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
      <View style={styles.endSliderWrap} onLayout={handleSliderLayout}>
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
        <Slider
          accessibilityLabel={t('walk.recording.endWalk')}
          disabled={isStopping}
          maximumTrackTintColor={TRANSPARENT_CONTROL_COLOR}
          maximumValue={SLIDE_MAX}
          minimumTrackTintColor={TRANSPARENT_CONTROL_COLOR}
          minimumValue={SLIDE_MIN}
          hitSlop={{
            top: 0,
            right: SLIDE_THUMB_CENTER_OFFSET,
            bottom: 0,
            left: SLIDE_THUMB_CENTER_OFFSET,
          }}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleSlideChange}
          step={SLIDE_STEP}
          style={styles.endSlider}
          testID="walk-end-rn-slider"
          thumbSize={components.walkControls.endSlideKnobSize}
          thumbTintColor={TRANSPARENT_CONTROL_COLOR}
          value={slideValue}
        />
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
  endSlider: {
    position: 'absolute',
    top: 0,
    right: SLIDE_THUMB_CENTER_OFFSET,
    bottom: 0,
    left: SLIDE_THUMB_CENTER_OFFSET,
    height: components.walkControls.endSlideHeight,
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
