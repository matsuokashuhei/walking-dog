import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useIsAuthenticated } from './use-is-authenticated';
import { useAcceptInvitation } from './use-accept-invitation';
import { savePendingInviteToken } from '@/lib/auth/pending-invite-token';
import { extractGraphQLErrorMessage } from '@/lib/graphql/errors';
import { mapInviteErrorKey, type InviteErrorKey } from '@/lib/errors/invite-error-map';

export type AcceptInviteStatus = 'idle' | 'loading' | 'success' | 'error';
export type AcceptInviteErrorKey = InviteErrorKey | 'invite.error.saveFailed';

interface AcceptInviteFlowState {
  status: AcceptInviteStatus;
  dogName: string | null;
  errorKey: AcceptInviteErrorKey | null;
}

const INITIAL_STATE: AcceptInviteFlowState = {
  status: 'idle',
  dogName: null,
  errorKey: null,
};

export function useAcceptInviteFlow(token: string | undefined) {
  const isAuthenticated = useIsAuthenticated();
  const acceptInvitation = useAcceptInvitation();
  const router = useRouter();

  const [state, setState] = useState<AcceptInviteFlowState>(INITIAL_STATE);

  const runAccept = useCallback(
    async (inviteToken: string) => {
      setState({ status: 'loading', dogName: null, errorKey: null });
      try {
        const dog = await acceptInvitation.mutateAsync(inviteToken);
        setState({ status: 'success', dogName: dog.name, errorKey: null });
      } catch (err: unknown) {
        const msg = extractGraphQLErrorMessage(err);
        setState({ status: 'error', dogName: null, errorKey: mapInviteErrorKey(msg) });
      }
    },
    [acceptInvitation],
  );

  useEffect(() => {
    if (!token) return;

    if (!isAuthenticated) {
      savePendingInviteToken(token)
        .then(() => router.replace('/(auth)/login'))
        .catch(() => {
          setState({ status: 'error', dogName: null, errorKey: 'invite.error.saveFailed' });
        });
      return;
    }

    void runAccept(token);
  }, [token, isAuthenticated, router, runAccept]);

  const accept = useCallback(async () => {
    if (!token) return;
    await runAccept(token);
  }, [token, runAccept]);

  return { ...state, accept };
}
