import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WalkQuickActions } from './WalkQuickActions';
import * as walkEventMutations from '@/hooks/use-walk-event-mutations';
import * as walkStore from '@/stores/walk-store';
import type { Dog, WalkEvent } from '@/types/graphql';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@/stores/walk-store', () => ({ useWalkStore: jest.fn() }));
jest.mock('@/hooks/use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
}));
jest.spyOn(Alert, 'alert');

const mockMutateAsync = jest.fn();
const addEvent = jest.fn();

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

const defaultStoreState = {
  walkId: 'walk-123' as string | null,
  points: [{ lat: 35.68, lng: 139.76, recordedAt: '2026-04-12T10:00:00Z' }],
  events: [] as WalkEvent[],
  addEvent,
};

function setupMocks(
  storeOverrides: Partial<typeof defaultStoreState> = {},
  opts: { recordIsPending?: boolean } = {},
) {
  const state = { ...defaultStoreState, ...storeOverrides };
  (walkStore.useWalkStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  );
  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: opts.recordIsPending ?? false,
  });
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('WalkQuickActions', () => {
  it('shows the record error alert without console.error noise when pee fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('boom'));

    render(<WalkQuickActions dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: 'Coco Pee' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        'Failed to record. Please try again.',
      );
    });

    expect(addEvent).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('does not render the unsupported photo action', () => {
    render(<WalkQuickActions dogs={[coco, momo]} />);

    expect(screen.queryByRole('button', { name: /photo/i })).toBeNull();
  });
});
