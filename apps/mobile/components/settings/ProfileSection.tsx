import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUpdateProfile } from '@/hooks/use-profile-mutation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface ProfileSectionProps {
  displayName: string | null;
}

export function ProfileSection({ displayName }: ProfileSectionProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName ?? '');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!editValue.trim()) return;
    setError('');
    try {
      await updateProfile({ displayName: editValue.trim() });
      setIsEditing(false);
    } catch {
      setError(t('settings.updateError'));
    }
  }

  function handleCancel() {
    setEditValue(displayName ?? '');
    setIsEditing(false);
    setError('');
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.profile')}
      </Text>
      {isEditing ? (
        <View>
          <TextInput
            label={t('settings.displayName')}
            value={editValue}
            onChangeText={setEditValue}
            error={error || undefined}
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              label={t('settings.cancel')}
              variant="secondary"
              onPress={handleCancel}
              style={styles.actionButton}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label={t('settings.save')}
              onPress={handleSave}
              loading={isPending}
              disabled={!editValue.trim()}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.displayRow}>
          <View style={styles.nameSection}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('settings.displayName')}
            </Text>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {displayName ?? '-'}
            </Text>
          </View>
          <Button
            label={t('settings.edit')}
            variant="secondary"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameSection: { flex: 1 },
  label: { ...typography.caption },
  nameText: { ...typography.bodyMedium, marginTop: spacing.xs },
  editButton: { width: 80 },
  actions: { flexDirection: 'row' },
  actionButton: { flex: 1 },
});
