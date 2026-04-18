import { fireEvent, render, screen } from '@testing-library/react-native';
import { PerDogSummaryCard } from './PerDogSummaryCard';
import type { Dog, WalkEvent } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = { ...coco, id: 'dog-2', name: 'Momo' };

const event = (
  dogId: string,
  type: 'pee' | 'poo' | 'photo',
  id: string,
): WalkEvent => ({
  id,
  walkId: 'walk-1',
  dogId,
  eventType: type,
  occurredAt: '2026-04-19T10:00:00Z',
  lat: null,
  lng: null,
  photoUrl: null,
});

describe('PerDogSummaryCard', () => {
  it('renders one row per dog with their name', () => {
    render(<PerDogSummaryCard dogs={[coco, momo]} events={[]} />);
    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Momo')).toBeTruthy();
  });

  it('counts events per dog', () => {
    const events = [
      event('dog-1', 'pee', 'e1'),
      event('dog-1', 'pee', 'e2'),
      event('dog-1', 'poo', 'e3'),
      event('dog-1', 'photo', 'e4'),
      event('dog-1', 'photo', 'e5'),
      event('dog-1', 'photo', 'e6'),
      event('dog-2', 'pee', 'e7'),
      event('dog-2', 'photo', 'e8'),
    ];
    render(<PerDogSummaryCard dogs={[coco, momo]} events={events} />);
    expect(screen.getByText(/💧 2\s+·\s+💩 1\s+·\s+📷 3/)).toBeTruthy();
    expect(screen.getByText(/💧 1\s+·\s+💩 0\s+·\s+📷 1/)).toBeTruthy();
  });

  it('shows zero counts when no events match the dog', () => {
    render(<PerDogSummaryCard dogs={[coco]} events={[event('dog-2', 'pee', 'e1')]} />);
    expect(screen.getByText(/💧 0\s+·\s+💩 0\s+·\s+📷 0/)).toBeTruthy();
  });

  it('fires onViewEach when the link is pressed', () => {
    const onViewEach = jest.fn();
    render(
      <PerDogSummaryCard dogs={[coco, momo]} events={[]} onViewEach={onViewEach} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'View each' }));
    expect(onViewEach).toHaveBeenCalled();
  });

  it('hides the link when onViewEach is not provided', () => {
    render(<PerDogSummaryCard dogs={[coco]} events={[]} />);
    expect(screen.queryByRole('button', { name: 'View each' })).toBeNull();
  });
});
