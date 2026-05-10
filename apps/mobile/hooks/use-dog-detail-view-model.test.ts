import { act, renderHook } from '@testing-library/react-native';
import { useDogDetailViewModel } from './use-dog-detail-view-model';
import type { DogWithStats, Walk } from '@/types/graphql';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDeleteDog = jest.fn();
const mockRunWithAlert = jest.fn();

let mockDog: DogWithStats | null = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Shiba Inu',
  gender: 'FEMALE',
  birthday: { year: 2022, month: 4, day: 1 },
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  walkStats: null,
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      role: 'owner',
      user: { displayName: 'Mio', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'member-2',
      userId: 'user-2',
      role: 'member',
      user: { displayName: 'Ken', avatarUrl: null },
      createdAt: '2026-01-02T00:00:00Z',
    },
  ],
};
let mockDogLoading = false;
let mockWalks: Walk[] = [
  {
    id: 'walk-1',
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
    status: 'FINISHED',
    distanceM: 1000,
    durationSec: 1200,
    startedAt: '2026-04-20T08:00:00Z',
    endedAt: '2026-04-20T08:20:00Z',
    points: [],
    events: [],
  },
  {
    id: 'walk-2',
    dogs: [
      {
        id: 'dog-2',
        name: 'Momo',
        breed: 'Poodle',
        gender: 'MALE',
        birthday: null,
        photoUrl: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    status: 'FINISHED',
    distanceM: 500,
    durationSec: 600,
    startedAt: '2026-04-20T09:00:00Z',
    endedAt: '2026-04-20T09:10:00Z',
    points: [],
    events: [],
  },
];
let mockPack = {
  todayKm: 1,
  goalKm: 5,
  progressPct: 20,
  perDog: {
    'dog-1': { streakDays: 5 },
  },
};
let mockMe = { id: 'user-1' };
let mockIsOwner = true;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDog, isLoading: mockDogLoading }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: mockWalks }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => mockPack,
}));

jest.mock('@/hooks/use-dog-mutations', () => ({
  useDeleteDog: () => ({ mutateAsync: mockDeleteDog }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: mockMe }),
}));

jest.mock('@/hooks/use-mutation-with-alert', () => ({
  useMutationWithAlert: () => mockRunWithAlert,
}));

jest.mock('@/hooks/use-dog-detail-authorization', () => ({
  useDogDetailAuthorization: () => ({ isOwner: mockIsOwner }),
}));

function expectReadyViewModel(
  viewModel: ReturnType<typeof useDogDetailViewModel>,
): Extract<ReturnType<typeof useDogDetailViewModel>, { status: 'ready' }> {
  if (viewModel.status !== 'ready') {
    throw new Error('Expected ready dog detail view model');
  }

  return viewModel;
}

describe('useDogDetailViewModel', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDogLoading = false;
    mockDog = {
      id: 'dog-1',
      name: 'Coco',
      breed: 'Shiba Inu',
      gender: 'FEMALE',
      birthday: { year: 2022, month: 4, day: 1 },
      photoUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
      walkStats: null,
      members: [
        {
          id: 'member-1',
          userId: 'user-1',
          role: 'owner',
          user: { displayName: 'Mio', avatarUrl: null },
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          role: 'member',
          user: { displayName: 'Ken', avatarUrl: null },
          createdAt: '2026-01-02T00:00:00Z',
        },
      ],
    };
    mockWalks = [
      {
        id: 'walk-1',
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
        status: 'FINISHED',
        distanceM: 1000,
        durationSec: 1200,
        startedAt: '2026-04-20T08:00:00Z',
        endedAt: '2026-04-20T08:20:00Z',
        points: [],
        events: [],
      },
      {
        id: 'walk-2',
        dogs: [
          {
            id: 'dog-2',
            name: 'Momo',
            breed: 'Poodle',
            gender: 'MALE',
            birthday: null,
            photoUrl: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        status: 'FINISHED',
        distanceM: 500,
        durationSec: 600,
        startedAt: '2026-04-20T09:00:00Z',
        endedAt: '2026-04-20T09:10:00Z',
        points: [],
        events: [],
      },
    ];
    mockPack = {
      todayKm: 1,
      goalKm: 5,
      progressPct: 20,
      perDog: {
        'dog-1': { streakDays: 5 },
      },
    };
    mockMe = { id: 'user-1' };
    mockIsOwner = true;
    mockDeleteDog.mockResolvedValue(true);
    mockRunWithAlert.mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it('returns loading until the dog query resolves', () => {
    mockDogLoading = true;

    const { result } = renderHook(() => useDogDetailViewModel());

    expect(result.current.status).toBe('loading');
  });

  it('builds the meta text, disabled member count, streak, and filtered dog walks', () => {
    const { result } = renderHook(() => useDogDetailViewModel());

    const vm = expectReadyViewModel(result.current);

    expect(vm.meta).toBe('4y · Shiba Inu');
    expect(vm.memberCount).toBe(0);
    expect(vm.streakDays).toBe(5);
    expect(vm.dogWalks.map((walk) => walk.id)).toEqual(['walk-1']);
    expect(vm.isOwner).toBe(true);
  });

  it('exposes walk navigation and disables unsupported members/friends navigation', () => {
    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    act(() => {
      vm.handleOpenWalk('walk-8');
      vm.handleOpenMembers();
      vm.handleOpenFriends();
    });

    expect(mockPush).toHaveBeenNthCalledWith(1, '/walks/walk-8');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('toggles delete confirmation visibility inside the view model', () => {
    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    act(() => {
      vm.openDeleteConfirm();
    });
    expect(expectReadyViewModel(result.current).showDeleteConfirm).toBe(true);

    act(() => {
      vm.closeDeleteConfirm();
    });
    expect(expectReadyViewModel(result.current).showDeleteConfirm).toBe(false);
  });

  it('deletes the dog through the alert helper and returns to the dogs tab on success', async () => {
    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    await act(async () => {
      await vm.handleDelete();
    });

    expect(mockRunWithAlert).toHaveBeenCalledWith(expect.any(Function), 'dogs.detail.deleteError');
    expect(mockDeleteDog).toHaveBeenCalledWith('dog-1');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dogs');
  });

  it('does not navigate away when delete returns null', async () => {
    mockRunWithAlert.mockResolvedValue(null);

    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    await act(async () => {
      await vm.handleDelete();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
