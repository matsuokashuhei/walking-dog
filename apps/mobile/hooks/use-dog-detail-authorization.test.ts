import { renderHook } from '@testing-library/react-native';
import { useDogDetailAuthorization } from './use-dog-detail-authorization';
import type { DogWithStats, User } from '@/types/graphql';

function makeMe(id: string): User {
  return {
    id,
    displayName: null,
    avatarUrl: null,
    encounterDetectionEnabled: true,
    dogs: [],
    createdAt: '',
  };
}

function makeDog(members: { userId: string; role: 'owner' | 'member' }[]): DogWithStats {
  return {
    id: 'd-1',
    name: 'Rex',
    breed: null,
    gender: null,
    birthDate: null,
    photoUrl: null,
    createdAt: '',
    walkStats: null,
    members: members.map((m, i) => ({
      id: `m-${i}`,
      userId: m.userId,
      role: m.role,
      user: { displayName: null, avatarUrl: null },
      createdAt: '',
    })),
  };
}

describe('useDogDetailAuthorization', () => {
  it('isOwner is true when current user is the owner', () => {
    const { result } = renderHook(() =>
      useDogDetailAuthorization(
        makeDog([{ userId: 'u-1', role: 'owner' }]),
        makeMe('u-1'),
      ),
    );
    expect(result.current.isOwner).toBe(true);
  });

  it('isOwner is false when current user is a member (not owner)', () => {
    const { result } = renderHook(() =>
      useDogDetailAuthorization(
        makeDog([
          { userId: 'u-1', role: 'owner' },
          { userId: 'u-2', role: 'member' },
        ]),
        makeMe('u-2'),
      ),
    );
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when current user is not a member of the dog', () => {
    const { result } = renderHook(() =>
      useDogDetailAuthorization(
        makeDog([{ userId: 'u-1', role: 'owner' }]),
        makeMe('u-other'),
      ),
    );
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when dog has no members field', () => {
    const { result } = renderHook(() =>
      useDogDetailAuthorization({ ...makeDog([]), members: undefined }, makeMe('u-1')),
    );
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when me is undefined', () => {
    const { result } = renderHook(() =>
      useDogDetailAuthorization(makeDog([{ userId: 'u-1', role: 'owner' }]), undefined),
    );
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when dog is undefined', () => {
    const { result } = renderHook(() => useDogDetailAuthorization(undefined, makeMe('u-1')));
    expect(result.current.isOwner).toBe(false);
  });
});
