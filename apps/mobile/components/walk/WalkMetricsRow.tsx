import { StyleSheet, View } from 'react-native';
import { Metric } from '@/components/ui/Metric';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

interface WalkMetricItem {
  label: string;
  value: string;
  unit?: string;
}

interface WalkMetricsRowProps {
  metrics: WalkMetricItem[];
}

// 記録中メトリクスを横並びで表示し、各セルの色は現在テーマに合わせます。
export function WalkMetricsRow({ metrics }: WalkMetricsRowProps) {
  const theme = useColors();

  return (
    <View style={styles.metrics}>
      {metrics.map((metric) => (
        <Metric
          key={metric.label}
          label={metric.label}
          value={metric.value}
          unit={metric.unit}
          color={theme.onSurface}
          subColor={theme.onSurfaceVariant}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
});
