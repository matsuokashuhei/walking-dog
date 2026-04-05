import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import {
  useGenerateInvitation,
  useRemoveMember,
  useLeaveDog,
} from '@/hooks/use-dog-member-mutations';
import { useMe } from '@/hooks/use-me';
import { DogMembersList } from '@/components/dogs/DogMembersList';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function DogMembersScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading: dogLoading } = useDog(id, 'ALL');
  const { data: me, isLoading: meLoading } = useMe();
  const generateInvitation = useGenerateInvitation();
  const removeMember = useRemoveMember();
  const leaveDog = useLeaveDog();

  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  if (dogLoading || meLoading || !dog || !me) return <LoadingScreen />;

  const members = dog.members ?? [];
  const currentUserId = me.id;
  const isOwner = members.some(
    (m) => m.userId === currentUserId && m.role === 'owner',
  );

  async function handleInvite() {
    try {
      const invitation = await generateInvitation.mutateAsync(id);
      const url = `walking-dog://invite/${invitation.token}`;
      await Share.share({ message: url });
    } catch {
      Alert.alert(t('common.error'), t('dogs.members.inviteError'));
    }
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    try {
      await removeMember.mutateAsync({
        dogId: id,
        userId: confirmRemove.userId,
      });
      setConfirmRemove(null);
    } catch {
      Alert.alert(t('common.error'), t('dogs.members.removeError'));
    }
  }

  async function handleLeave() {
    try {
      await leaveDog.mutateAsync(id);
      router.replace('/(tabs)/dogs');
    } catch {
      Alert.alert(t('common.error'), t('dogs.members.leaveError'));
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.listSection}>
        <DogMembersList
          members={members}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onRemove={(userId, name) => setConfirmRemove({ userId, name })}
        />
      </View>

      <View style={styles.actions}>
        {isOwner ? (
          <Button
            label={t('dogs.members.invite')}
            onPress={handleInvite}
            loading={generateInvitation.isPending}
          />
        ) : (
          <Button
            label={t('dogs.members.leave')}
            variant="destructive"
            onPress={() => setShowLeaveConfirm(true)}
            loading={leaveDog.isPending}
          />
        )}
      </View>

      <ConfirmDialog
        visible={confirmRemove !== null}
        title={t('dogs.members.removeTitle')}
        message={t('dogs.members.removeConfirm', { name: confirmRemove?.name })}
        confirmLabel={t('dogs.members.remove')}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
        destructive
      />

      <ConfirmDialog
        visible={showLeaveConfirm}
        title={t('dogs.members.leaveTitle')}
        message={t('dogs.members.leaveConfirm', { name: dog.name })}
        confirmLabel={t('dogs.members.leave')}
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveConfirm(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listSection: { padding: spacing.lg },
  actions: { padding: spacing.lg, paddingTop: 0 },
});
