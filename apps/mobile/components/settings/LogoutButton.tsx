import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/use-auth';

export function LogoutButton() {
  const { t } = useTranslation();
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
      <Button
        label={t('settings.signOut')}
        variant="destructive"
        onPress={() => setShowConfirm(true)}
        loading={loading}
      />
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
