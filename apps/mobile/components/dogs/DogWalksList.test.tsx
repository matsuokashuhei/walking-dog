import { fireEvent, render, screen } from '@testing-library/react-native';
import { DogWalksList } from './DogWalksList';
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
  events: [],
};

describe('DogWalksList', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('shows the empty state when there are no walks and no error', () => {
    render(<DogWalksList walks={[]} />);

    expect(screen.getByText('No walks yet. Start your first walk!')).toBeTruthy();
    expect(screen.queryByText("Couldn't load walks.")).toBeNull();
  });

  it('shows an error message and a Retry button when error is set, and calls onRetry', () => {
    const onRetry = jest.fn();

    render(<DogWalksList walks={[]} error={new Error('boom')} onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load walks.")).toBeTruthy();
    // The empty state must NOT be shown while there is an error.
    expect(screen.queryByText('No walks yet. Start your first walk!')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the underlying error detail in dev builds', () => {
    render(
      <DogWalksList walks={[]} error={new Error('GraphQL field "trackPoints" failed')} onRetry={jest.fn()} />,
    );

    expect(screen.getByText('GraphQL field "trackPoints" failed')).toBeTruthy();
  });

  it('renders walk rows when walks are present and no error', () => {
    render(<DogWalksList walks={[walk]} />);

    expect(screen.queryByText("Couldn't load walks.")).toBeNull();
    expect(screen.queryByText('No walks yet. Start your first walk!')).toBeNull();
    expect(screen.getByText(/Today/)).toBeTruthy();
  });
});
