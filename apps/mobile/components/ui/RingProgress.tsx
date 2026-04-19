import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface RingProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  label?: string;
  labelColor?: string;
  labelFontSize?: number;
  accessibilityLabel?: string;
}

export function RingProgress({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  label,
  labelColor,
  labelFontSize = 11,
  accessibilityLabel,
}: RingProgressProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(clamped), min: 0, max: 100 }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={[styles.label, { color: labelColor ?? color, fontSize: labelFontSize }]}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
});
