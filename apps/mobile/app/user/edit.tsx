import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ContactChromeButton } from '@/components/ui/ContactChromeButton';
import { UserAvatarEditor } from '@/components/user/UserAvatarEditor';
import { useMe } from '@/hooks/use-me';
import { useUpdateUser } from '@/hooks/use-user-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useColors } from '@/hooks/use-colors';
import { dogContactChrome, spacing } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';
import type { User } from '@/types/graphql';

export default function UserEditScreen() {
  const { t } = useTranslation();
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) {
    return (
      <ErrorScreen
        message={t('user.loadError')}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return <UserEditContent me={me} />;
}

function UserEditContent({ me }: { me: User }) {
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
        'userEdit.saveError',
      );
      if (updated) router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View testID="user-edit-header" style={styles.header}>
        <ContactChromeButton
          shape="circle"
          label={t('common.action.cancel')}
          accessibilityLabel={t('common.action.cancel')}
          iconName="xmark"
          onPress={() => router.back()}
          testID="user-edit-cancel-button"
        />
        <ContactChromeButton
          shape="circle"
          label={t('common.action.save')}
          accessibilityLabel={t('common.action.save')}
          iconName="checkmark"
          onPress={handleSave}
          disabled={!canSave}
          testID="user-edit-save-button"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <UserAvatarEditor
          value={initialAvatar}
          displayName={name}
          onChange={setAvatarFile}
        />
        <GroupedCard elevated={false}>
          <TextInput
            label={t('userEdit.name')}
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
  header: {
    height: dogContactChrome.circleSize,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
});
