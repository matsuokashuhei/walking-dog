import { act, renderHook } from '@testing-library/react-native';
import { useDogsScreenViewModel } from './use-dogs-screen-view-model';
import type { Dog } from '@/types/graphql';

const mockPush = jest.fn();
const mockRefetch = jest.fn();

let mockMeData:
  | {
      dogs: Dog[];
    }
  | undefined = {
  dogs: [
    {
      id: 'dog-1',
      name: 'Coco',
      breed: 'Shiba Inu',
      gender: 'FEMALE',
      birthday: null,
      photoUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
};
let mockIsLoading = false;
let mockPack = {
  todayKm: 1.42,
  goalKm: 5,
  progressPct: 28,
  perDog: {
    'dog-1': { todayKm: 1.42, totalWalks: 10, streakDays: 3 },
  },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: mockMeData,
    isLoading: mockIsLoading,
    refetch: mockRefetch,
  }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => mockPack,
}));

describe('useDogsScreenViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeData = {
      dogs: [
        {
          id: 'dog-1',
          name: 'Coco',
          breed: 'Shiba Inu',
          gender: 'FEMALE',
          birthday: null,
          photoUrl: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    };
    mockIsLoading = false;
    mockPack = {
      todayKm: 1.42,
      goalKm: 5,
      progressPct: 28,
      perDog: {
        'dog-1': { todayKm: 1.42, totalWalks: 10, streakDays: 3 },
      },
    };
  });

  it('returns the dogs list and pack progress from the backing hooks', () => {
    const { result } = renderHook(() => useDogsScreenViewModel());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.dogs).toEqual([
      expect.objectContaining({ id: 'dog-1', name: 'Coco' }),
    ]);
    expect(result.current.pack).toEqual(mockPack);
  });

  it('falls back to an empty dogs list when me is not loaded yet', () => {
    mockMeData = undefined;

    const { result } = renderHook(() => useDogsScreenViewModel());

    expect(result.current.dogs).toEqual([]);
  });

  it('opens the create-dog screen and dog detail routes', () => {
    const { result } = renderHook(() => useDogsScreenViewModel());

    act(() => {
      result.current.handleAddDog();
      result.current.handleOpenDog('dog-9');
    });

    expect(mockPush).toHaveBeenNthCalledWith(1, '/dogs/new');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/dogs/dog-9');
  });

  it('exposes a refresh handler backed by useMe.refetch', () => {
    const { result } = renderHook(() => useDogsScreenViewModel());

    act(() => {
      result.current.handleRefresh();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
