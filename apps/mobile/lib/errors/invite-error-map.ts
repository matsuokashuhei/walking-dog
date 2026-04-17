export type InviteErrorKey =
  | 'invite.error.expired'
  | 'invite.error.alreadyUsed'
  | 'invite.error.alreadyMember'
  | 'invite.error.generic';

export function mapInviteErrorKey(errorMsg: string | null): InviteErrorKey {
  if (!errorMsg) return 'invite.error.generic';
  const lower = errorMsg.toLowerCase();
  if (lower.includes('expired')) return 'invite.error.expired';
  if (lower.includes('already been used')) return 'invite.error.alreadyUsed';
  if (lower.includes('already a member')) return 'invite.error.alreadyMember';
  return 'invite.error.generic';
}
