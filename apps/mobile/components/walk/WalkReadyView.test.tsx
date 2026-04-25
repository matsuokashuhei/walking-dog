import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkReadyView } from './WalkReadyView';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const FIXED_NOW = new Date('2026-04-19T12:00:00Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Toy Poodle',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
  latestWalk: {
    endedAt: new Date(FIXED_NOW.getTime() - 14 * 60 * 60 * 1000).toISOString(),
  },
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: 'Shiba Inu',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
  latestWalk: {
    endedAt: new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
};

type StoreState = {
  selectedDogIds: string[];
  selectDog: (id: string) => void;
  setSelectedDogs: (ids: string[]) => void;
};

const buildStore = (initial: string[] = []) => {
  const state: StoreState = {
    selectedDogIds: initial,
    selectDog: jest.fn((id: string) => {
      state.selectedDogIds = state.selectedDogIds.includes(id)
        ? state.selectedDogIds.filter((x) => x !== id)
        : [...state.selectedDogIds, id];
    }),
    setSelectedDogs: jest.fn((ids: string[]) => {
      state.selectedDogIds = ids;
    }),
  };
  return state;
};

let mockStore = buildStore();

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: StoreState) => unknown) => selector(mockStore),
}));

let mockDogs: Dog[] = [];

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: { dogs: mockDogs },
    isLoading: false,
  }),
}));

describe('WalkReadyView', () => {
  beforeEach(() => {
    mockStore = buildStore();
    mockDogs = [coco, momo];
  });

  it('renders the Walk largeTitle', () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('Walk')).toBeTruthy();
  });

  it('renders the Walking with section with Select all action when 2+ dogs', () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('Walking with')).toBeTruthy();
    expect(screen.getByText('Select all')).toBeTruthy();
  });

  it('disables START when no dog is selected', () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    const btn = screen.getByRole('button', { name: 'START' });
    expect(btn.props.accessibilityState.disabled).toBe(true);
  });

  it('enables START when at least one dog is selected and calls onStart', () => {
    mockStore = buildStore(['dog-1']);
    const onStart = jest.fn();
    render(<WalkReadyView onStart={onStart} isStarting={false} />);
    const btn = screen.getByRole('button', { name: 'START' });
    expect(btn.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('Select all selects every dog when some are unselected', () => {
    mockStore = buildStore(['dog-1']);
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    fireEvent.press(screen.getByRole('button', { name: 'Select all' }));
    expect(mockStore.setSelectedDogs).toHaveBeenCalledWith(['dog-1', 'dog-2']);
  });

  it('Select all clears selection when every dog is already selected', () => {
    mockStore = buildStore(['dog-1', 'dog-2']);
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    fireEvent.press(screen.getByRole('button', { name: 'Deselect all' }));
    expect(mockStore.setSelectedDogs).toHaveBeenCalledWith([]);
  });

  it('renders the Precise hint copy', () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(
      screen.getByText(
        "Tap to begin. We'll follow your route and log everything gently.",
      ),
    ).toBeTruthy();
  });

  it('does not render a Group walk summary anymore', () => {
    mockStore = buildStore(['dog-1', 'dog-2']);
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.queryByText('Group walk')).toBeNull();
  });

  it('shows the noDogs empty state when user has zero dogs', () => {
    mockDogs = [];
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('Register a dog first')).toBeTruthy();
  });

  describe('single-dog variant', () => {
    beforeEach(() => {
      mockDogs = [coco];
      mockStore = buildStore();
    });

    it('hides the Select all action', () => {
      render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
      expect(screen.queryByText('Select all')).toBeNull();
    });

    it('hides the checkbox but still renders the dog', () => {
      render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
      expect(screen.queryByRole('checkbox', { name: 'Coco' })).toBeNull();
      expect(screen.getByText('Coco')).toBeTruthy();
      expect(screen.getByText('Last walk 14 hours ago')).toBeTruthy();
    });

    it('auto-selects the only dog so START is enabled', () => {
      render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
      expect(mockStore.setSelectedDogs).toHaveBeenCalledWith(['dog-1']);
    });
  });
});
