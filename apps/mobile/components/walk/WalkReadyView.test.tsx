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

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Toy Poodle',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: 'Shiba Inu',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
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

  it("renders the Who's coming? section with Select all action", () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText("Who's coming?")).toBeTruthy();
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
        "We'll log pees, poops and photos for each dog separately.",
      ),
    ).toBeTruthy();
  });

  it('does not render a Recent Walks section anymore', () => {
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.queryByText('Recent Walks')).toBeNull();
  });

  it('shows the Group walk summary only when 2+ dogs are selected', () => {
    mockStore = buildStore(['dog-1']);
    const { rerender } = render(
      <WalkReadyView onStart={jest.fn()} isStarting={false} />,
    );
    expect(screen.queryByText('Group walk')).toBeNull();

    mockStore = buildStore(['dog-1', 'dog-2']);
    rerender(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('Group walk')).toBeTruthy();
  });

  it('shows the noDogs empty state when user has zero dogs', () => {
    mockDogs = [];
    render(<WalkReadyView onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('Register a dog first')).toBeTruthy();
  });
});
