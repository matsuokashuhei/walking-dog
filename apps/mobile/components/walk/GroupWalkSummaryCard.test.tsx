import { render, screen } from '@testing-library/react-native';
import { GroupWalkSummaryCard } from './GroupWalkSummaryCard';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const dog = (id: string, name: string): Dog => ({
  id,
  name,
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
});

describe('GroupWalkSummaryCard', () => {
  it('does not render when fewer than 2 dogs are selected', () => {
    const { toJSON } = render(
      <GroupWalkSummaryCard dogs={[dog('1', 'Coco')]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders count and group walk tag when 2 dogs are selected', () => {
    render(
      <GroupWalkSummaryCard dogs={[dog('1', 'Coco'), dog('2', 'Momo')]} />,
    );
    expect(screen.getByText(/2/)).toBeTruthy();
    expect(screen.getByText('Group walk')).toBeTruthy();
  });

  it('renders up to 3 avatars for 3+ selected dogs', () => {
    render(
      <GroupWalkSummaryCard
        dogs={[
          dog('1', 'Coco'),
          dog('2', 'Momo'),
          dog('3', 'Biscuit'),
          dog('4', 'Luna'),
        ]}
      />,
    );
    expect(screen.getAllByTestId('group-walk-avatar')).toHaveLength(3);
    expect(screen.getByText(/4/)).toBeTruthy();
  });
});
