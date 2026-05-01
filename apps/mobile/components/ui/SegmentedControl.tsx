import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';

interface SegmentOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selected: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  const theme = useColors();

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceContainer }]}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              isSelected && [styles.selectedSegment, { backgroundColor: theme.surface }],
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? theme.onSurface : theme.onSurfaceVariant },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xs / 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md - spacing.xs / 2,
  },
  selectedSegment: {},
  label: {
    ...typography.metricLabel,
  },
});
