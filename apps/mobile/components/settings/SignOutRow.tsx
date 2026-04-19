import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme/tokens';

export function SignOutRow() {
  const { t } = useTranslation();
  const theme = useColors();
  const { signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <GroupedCard elevated={false} style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.signOut')}
          onPress={() => setShowConfirm(true)}
          disabled={loading}
          style={styles.row}
        >
          <Text style={[styles.label, { color: theme.error }]}>
            {t('settings.signOut')}
          </Text>
        </Pressable>
      </GroupedCard>
      <ConfirmDialog
        visible={showConfirm}
        title={t('settings.signOut')}
        message={t('settings.signOutConfirm')}
        confirmLabel={t('settings.signOut')}
        cancelLabel={t('settings.cancel')}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        destructive
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  row: {
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  label: {
    fontSize: 17,
    fontWeight: '500',
  },
});
