import { fireEvent, render, screen } from '@testing-library/react-native';
import { DogWalkRow } from './DogWalkRow';
import type { Walk } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const walk: Walk = {
  id: 'walk-1',
  dogs: [
    {
      id: 'dog-1',
      name: 'Coco',
      breed: 'Toy Poodle',
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
  events: [
    {
      id: 'event-1',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-04-20T08:05:00Z',
      lat: null,
      lng: null,
      photoUrl: null,
    },
    {
      id: 'event-2',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'poo',
      occurredAt: '2026-04-20T08:10:00Z',
      lat: null,
      lng: null,
      photoUrl: null,
    },
    {
      id: 'event-3',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'poo',
      occurredAt: '2026-04-20T08:12:00Z',
      lat: null,
      lng: null,
      photoUrl: null,
    },
    {
      id: 'event-4',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'photo',
      occurredAt: '2026-04-20T08:14:00Z',
      lat: null,
      lng: null,
      photoUrl: null,
    },
  ],
};

describe('DogWalkRow', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the walk date, meta summary, and counted events', () => {
    render(<DogWalkRow walk={walk} />);

    expect(screen.getByText(/Today/)).toBeTruthy();
    expect(screen.getByText(`1.00 km · 20:00 · 20'00"/km`)).toBeTruthy();
    expect(screen.getByText('💧1')).toBeTruthy();
    expect(screen.getByText('💩2')).toBeTruthy();
  });

  it('calls onPress with the walk id', () => {
    const onPress = jest.fn();

    render(<DogWalkRow walk={walk} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith('walk-1');
  });

  it('omits event badges when there are no pee or poo events', () => {
    render(
      <DogWalkRow
        walk={{
          ...walk,
          events: [
            {
              id: 'event-photo',
              walkId: 'walk-1',
              dogId: 'dog-1',
              eventType: 'photo',
              occurredAt: '2026-04-20T08:14:00Z',
              lat: null,
              lng: null,
              photoUrl: null,
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText(/💧/)).toBeNull();
    expect(screen.queryByText(/💩/)).toBeNull();
  });
});
