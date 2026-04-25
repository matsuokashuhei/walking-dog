import { fireEvent, render, screen } from '@testing-library/react-native';
import { DogPickerCard } from './DogPickerCard';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const FIXED_NOW = new Date('2026-04-18T12:00:00Z');

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
    endedAt: new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
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
  latestWalk: { endedAt: '2026-04-17T06:00:00Z' },
};

describe('DogPickerCard', () => {
  it('renders each dog name and the last walk label', () => {
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={[]}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Last walk 2 hours ago')).toBeTruthy();
    expect(screen.getByText('Momo')).toBeTruthy();
    expect(screen.getByText('Last walk yesterday')).toBeTruthy();
  });

  it('marks selected rows with accessibilityState.checked = true', () => {
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={['dog-1']}
        onToggle={jest.fn()}
      />,
    );
    const cocoRow = screen.getByRole('checkbox', { name: 'Coco' });
    const momoRow = screen.getByRole('checkbox', { name: 'Momo' });
    expect(cocoRow.props.accessibilityState.checked).toBe(true);
    expect(momoRow.props.accessibilityState.checked).toBe(false);
  });

  it('invokes onToggle with the dog id when a row is pressed', () => {
    const onToggle = jest.fn();
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={[]}
        onToggle={onToggle}
      />,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Momo' }));
    expect(onToggle).toHaveBeenCalledWith('dog-2');
  });

  it('renders never-walked copy when latestWalk is missing', () => {
    const mystery: Dog = { ...coco, id: 'dog-3', name: 'Mystery', latestWalk: null };
    render(
      <DogPickerCard
        dogs={[mystery]}
        selectedIds={[]}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('Mystery')).toBeTruthy();
    expect(screen.getByText('Ready for the first walk')).toBeTruthy();
  });

  it('hides the checkbox when variant is single', () => {
    render(
      <DogPickerCard
        dogs={[coco]}
        selectedIds={['dog-1']}
        onToggle={jest.fn()}
        variant="single"
      />,
    );
    expect(screen.queryByRole('checkbox', { name: 'Coco' })).toBeNull();
    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Last walk 2 hours ago')).toBeTruthy();
  });
});
