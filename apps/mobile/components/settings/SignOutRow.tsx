import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NativeFieldRow, NativeFieldSection } from '@/components/ui/NativeFieldGroup';
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
      <NativeFieldSection style={styles.card}>
        <NativeFieldRow
          disabled={loading}
          label={t('settings.signOut')}
          labelColor={theme.error}
          onPress={() => setShowConfirm(true)}
        />
      </NativeFieldSection>
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
});
