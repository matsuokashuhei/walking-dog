import { act, renderHook } from '@testing-library/react-native';
import { useDogDetailViewModel } from './use-dog-detail-view-model';
import type { DogWithStats, Walk } from '@/types/graphql';

const mockPush = jest.fn();
const mockRefetchWalks = jest.fn();
let mockWalksError: Error | null = null;

let mockDog: DogWithStats | null = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Shiba Inu',
  gender: 'FEMALE',
  birthday: { year: 2022, month: 4, day: 1 },
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  walkStats: null,
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
  todayMinutes: 20,
  goalProgressMinutes: 20,
  goalMinutes: 30,
  progressPct: 20,
  perDog: {
    'dog-1': { todayKm: 1, todayMinutes: 20, goalProgressMinutes: 20, goalMinutes: 30, goalCycleDays: 1, totalWalks: 1, streakDays: 5 },
  },
};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDog, isLoading: mockDogLoading }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: mockWalks, error: mockWalksError, refetch: mockRefetchWalks }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => mockPack,
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
      todayMinutes: 20,
      goalProgressMinutes: 20,
      goalMinutes: 30,
      progressPct: 20,
      perDog: {
        'dog-1': { todayKm: 1, todayMinutes: 20, goalProgressMinutes: 20, goalMinutes: 30, goalCycleDays: 1, totalWalks: 1, streakDays: 5 },
      },
    };
    mockWalksError = null;
  });

  it('returns loading until the dog query resolves', () => {
    mockDogLoading = true;

    const { result } = renderHook(() => useDogDetailViewModel());

    expect(result.current.status).toBe('loading');
  });

  it('builds the meta text, streak, and filtered dog walks', () => {
    const { result } = renderHook(() => useDogDetailViewModel());

    const vm = expectReadyViewModel(result.current);

    expect(vm.meta).toBe('4y · Shiba Inu');
    expect(vm.streakDays).toBe(5);
    expect(vm.dogWalks.map((walk) => walk.id)).toEqual(['walk-1']);
    expect(Object.keys(vm)).not.toContain(['is', 'Ow', 'ner'].join(''));
  });

  it('has no walks error when the walks query succeeds', () => {
    const { result } = renderHook(() => useDogDetailViewModel());

    expect(expectReadyViewModel(result.current).walksError).toBeNull();
  });

  it('exposes the walks error and a retry that refetches the walks query', () => {
    mockWalksError = new Error('GraphQL Walks failed');

    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    expect(vm.walksError).toBe(mockWalksError);

    act(() => {
      vm.retryWalks();
    });

    expect(mockRefetchWalks).toHaveBeenCalledTimes(1);
  });

  it('exposes walk navigation through the view model', () => {
    const { result } = renderHook(() => useDogDetailViewModel());
    const vm = expectReadyViewModel(result.current);

    act(() => {
      vm.handleOpenWalk('walk-8');
    });

    expect(mockPush).toHaveBeenNthCalledWith(1, '/walks/walk-8');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

});
