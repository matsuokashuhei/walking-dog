import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { authenticatedRequest } from '@/lib/graphql/client';
import { UPDATE_ENCOUNTER_DETECTION_MUTATION } from '@/lib/graphql/mutations';
import { useInvalidateUserQueries } from '@/hooks/use-invalidate-user-queries';
import type { UpdateEncounterDetectionResponse } from '@/types/graphql';

interface EncounterDetectionSectionProps {
  enabled: boolean;
}

export function EncounterDetectionSection({ enabled }: EncounterDetectionSectionProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const invalidateUserQueries = useInvalidateUserQueries();

  const mutation = useMutation<UpdateEncounterDetectionResponse, Error, boolean>({
    mutationFn: async (newEnabled) => {
      return authenticatedRequest<UpdateEncounterDetectionResponse>(
        UPDATE_ENCOUNTER_DETECTION_MUTATION,
        { enabled: newEnabled },
      );
    },
    onSuccess: invalidateUserQueries,
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.onSurfaceVariant }]}>
        {t('settings.encounterDetection', 'ENCOUNTER DETECTION').toUpperCase()}
      </Text>

      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={[styles.rowLabel, { color: theme.onSurface }]}>
            {t('settings.encounterDetectionToggle', 'Detect nearby dogs')}
          </Text>
          <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
            {t(
              'settings.encounterDetectionDescription',
              'Automatically detect and record encounters with other dogs during walks',
            )}
          </Text>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={t('settings.encounterDetectionToggle', 'Detect nearby dogs')}
          accessibilityState={{ checked: enabled }}
          value={enabled}
          disabled={mutation.isPending}
          onValueChange={(value) => mutation.mutate(value)}
          trackColor={{ false: theme.border, true: theme.interactive }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  labelContainer: {
    flex: 1,
    flexShrink: 1,
  },
  rowLabel: {
    ...typography.body,
  },
  description: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
