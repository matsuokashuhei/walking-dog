import { StyleSheet, Text, View } from 'react-native';
import { components, typography } from '@/theme/tokens';

interface MetricProps {
  label: string;
  value: string;
  unit?: string;
  color: string;
  subColor: string;
}

export function Metric({ label, value, unit, color, subColor }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: subColor }]}>{label}</Text>
      <View style={styles.metricRow}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {unit ? <Text style={[styles.metricUnit, { color: subColor }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    gap: components.metric.gap,
  },
  metricLabel: {
    ...typography.metricLabel,
    fontWeight: components.metric.labelFontWeight,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    ...components.metric.value,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    ...typography.footnote,
    fontWeight: components.metric.unitFontWeight,
    marginLeft: components.metric.unitGap,
  },
});
