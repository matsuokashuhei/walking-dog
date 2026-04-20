import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme/tokens';

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
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  metricUnit: {
    ...typography.footnote,
    fontWeight: '500',
    marginLeft: 2,
  },
});
