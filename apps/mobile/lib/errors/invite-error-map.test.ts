import { mapInviteErrorKey } from './invite-error-map';

describe('mapInviteErrorKey', () => {
  it('returns expired key when message mentions "expired"', () => {
    expect(mapInviteErrorKey('Invitation has expired')).toBe('invite.error.expired');
    expect(mapInviteErrorKey('this invite is EXPIRED')).toBe('invite.error.expired');
  });

  it('returns alreadyUsed key when message mentions "already been used"', () => {
    expect(mapInviteErrorKey('Token has already been used')).toBe('invite.error.alreadyUsed');
    expect(mapInviteErrorKey('Already Been Used')).toBe('invite.error.alreadyUsed');
  });

  it('returns alreadyMember key when message mentions "already a member"', () => {
    expect(mapInviteErrorKey('User is already a member')).toBe('invite.error.alreadyMember');
  });

  it('returns generic key when message is null', () => {
    expect(mapInviteErrorKey(null)).toBe('invite.error.generic');
  });

  it('returns generic key when message does not match any known pattern', () => {
    expect(mapInviteErrorKey('Something weird happened')).toBe('invite.error.generic');
  });

  it('returns generic key when message is empty string', () => {
    expect(mapInviteErrorKey('')).toBe('invite.error.generic');
  });
});
