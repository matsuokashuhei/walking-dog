import { renderHook } from '@testing-library/react-native';
import { useDogDetailAuthorization } from './use-dog-detail-authorization';
import type { DogWithStats } from '@/types/graphql';

function makeDog(role: 'owner' | 'member' | undefined): DogWithStats {
  return {
    id: 'd-1',
    name: 'Rex',
    breed: null,
    gender: null,
    birthday: null,
    photoUrl: null,
    createdAt: '',
    walkStats: null,
    role,
  };
}

describe('useDogDetailAuthorization', () => {
  it('isOwner is true when dog.role is owner', () => {
    const { result } = renderHook(() => useDogDetailAuthorization(makeDog('owner')));
    expect(result.current.isOwner).toBe(true);
  });

  it('isOwner is false when dog.role is member', () => {
    const { result } = renderHook(() => useDogDetailAuthorization(makeDog('member')));
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when dog.role is undefined', () => {
    const { result } = renderHook(() => useDogDetailAuthorization(makeDog(undefined)));
    expect(result.current.isOwner).toBe(false);
  });

  it('isOwner is false when dog is undefined', () => {
    const { result } = renderHook(() => useDogDetailAuthorization(undefined));
    expect(result.current.isOwner).toBe(false);
  });
});
