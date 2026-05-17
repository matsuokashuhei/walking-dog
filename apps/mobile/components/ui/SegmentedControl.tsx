import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { components, radius, typography } from '@/theme/tokens';

interface SegmentOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export function SegmentedControl({ options, value, onChange, testID }: SegmentedControlProps) {
  const theme = useColors();

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: theme.surfaceContainer }]}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
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
    height: components.segmentedControl.height,
    borderRadius: radius.md,
    padding: components.segmentedControl.padding,
  },
  segment: {
    flex: 1,
    paddingHorizontal: components.segmentedControl.segmentPaddingH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: components.segmentedControl.segmentRadius,
  },
  selectedSegment: {},
  label: {
    ...typography.footnote,
  },
});
