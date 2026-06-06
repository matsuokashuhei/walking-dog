import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ProfileAvatarEditor } from '@/components/settings/ProfileAvatarEditor';
import { useMe } from '@/hooks/use-me';
import { useUpdateUser } from '@/hooks/use-user-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';
import type { User } from '@/types/graphql';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) {
    return (
      <ErrorScreen
        message={t('settings.profile.loadError')}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return <ProfileEditContent me={me} />;
}

function ProfileEditContent({ me }: { me: User }) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const runWithAlert = useMutationWithAlert();
  const { mutateAsync: updateUser } = useUpdateUser();
  const initialName = me.name ?? me.displayName ?? '';
  const initialAvatar = me.avatar ?? me.avatarUrl ?? null;
  const [name, setName] = useState(initialName);
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSave = name.trim().length > 0 && !submitting;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const updated = await runWithAlert(
        () =>
          updateUser({
            input: {
              name: name.trim(),
              ...(avatarFile ? { avatarFile } : {}),
            },
          }),
        'settings.profileEdit.saveError',
      );
      if (updated) router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('settings.profileEdit.title')}
        leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
        rightAction={{
          label: t('common.action.save'),
          onPress: handleSave,
          strong: true,
          disabled: !canSave,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileAvatarEditor
          value={initialAvatar}
          displayName={name}
          onChange={setAvatarFile}
        />
        <GroupedCard elevated={false}>
          <TextInput
            label={t('settings.profileEdit.name')}
            labelPosition="inline"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="done"
          />
        </GroupedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
});
