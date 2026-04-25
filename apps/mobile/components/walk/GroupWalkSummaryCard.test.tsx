import { render, screen } from '@testing-library/react-native';
import { GroupWalkSummaryCard } from './GroupWalkSummaryCard';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const dogs: Dog[] = [
  {
    id: 'dog-1',
    name: 'Coco',
    breed: 'Toy Poodle',
    gender: null,
    birthDate: null,
    photoUrl: null,
    createdAt: '2026-01-01',
  },
  {
    id: 'dog-2',
    name: 'Momo',
    breed: 'Shiba Inu',
    gender: null,
    birthDate: null,
    photoUrl: null,
    createdAt: '2026-01-02',
  },
  {
    id: 'dog-3',
    name: 'Sora',
    breed: 'Beagle',
    gender: null,
    birthDate: null,
    photoUrl: null,
    createdAt: '2026-01-03',
  },
];

describe('GroupWalkSummaryCard', () => {
  it('does not render when fewer than two dogs are selected', () => {
    render(<GroupWalkSummaryCard dogs={dogs.slice(0, 1)} />);
    expect(screen.queryByText('Group walk')).toBeNull();
  });

  it('renders stacked avatars, count copy, and tag for two dogs', () => {
    render(<GroupWalkSummaryCard dogs={dogs.slice(0, 2)} />);
    expect(screen.getByText('2 dogs')).toBeTruthy();
    expect(screen.getByText('walking together')).toBeTruthy();
    expect(screen.getByText('Group walk')).toBeTruthy();
    expect(screen.getAllByTestId(/group-walk-avatar-/)).toHaveLength(2);
  });

  it('renders three avatars when three dogs are selected', () => {
    render(<GroupWalkSummaryCard dogs={dogs} />);
    expect(screen.getByText('3 dogs')).toBeTruthy();
    expect(screen.getAllByTestId(/group-walk-avatar-/)).toHaveLength(3);
  });
});
