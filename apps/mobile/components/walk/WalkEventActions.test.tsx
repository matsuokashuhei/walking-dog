import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WalkEventActions } from './WalkEventActions';
import * as walkEventMutations from '@/hooks/use-walk-event-mutations';
import * as walkStore from '@/stores/walk-store';
import type { Dog, WalkEvent } from '@/types/graphql';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('@/stores/walk-store', () => ({ useWalkStore: jest.fn() }));
jest.mock('@/hooks/use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
  useGenerateWalkEventPhotoUploadUrl: jest.fn(),
}));
jest.spyOn(Alert, 'alert');

const mockMutateAsync = jest.fn();

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

const defaultStoreState = {
  walkId: 'walk-123' as string | null,
  points: [{ lat: 35.68, lng: 139.76, recordedAt: '2026-04-12T10:00:00Z' }],
  events: [] as WalkEvent[],
  addEvent: jest.fn(),
  removeEvent: jest.fn(),
  cameraRequestedAt: null,
  clearCameraRequest: jest.fn(),
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

describe('WalkEventActions — single dog', () => {
  it('renders pee and poop pills without the unsupported photo action', () => {
    render(<WalkEventActions dogs={[coco]} />);
    expect(screen.getByRole('button', { name: /pee/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /poop/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /photo/i })).toBeNull();
  });

  it('shows zero counts by default', () => {
    render(<WalkEventActions dogs={[coco]} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(2);
  });

  it('tapping pee records event with GPS, adds to store, and triggers haptic', async () => {
    const event = { id: 'event-1', eventType: 'pee' };
    mockMutateAsync.mockResolvedValue(event);

    render(<WalkEventActions dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          walkId: 'walk-123',
          dogId: 'dog-1',
          eventType: 'pee',
          lat: 35.68,
          lng: 139.76,
        }),
      );
      expect(defaultStoreState.addEvent).toHaveBeenCalledWith(event);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  it('tapping poop records event with poo eventType', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'event-2', eventType: 'poo' });
    render(<WalkEventActions dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: /poop/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'poo' }));
    });
  });

  it('on mutation failure, shows Alert, logs, and does not add event', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'));
    render(<WalkEventActions dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      expect(defaultStoreState.addEvent).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  it('with no GPS points, pee event omits lat/lng', async () => {
    setupMocks({ points: [] });
    mockMutateAsync.mockResolvedValue({ id: 'event-1' });
    render(<WalkEventActions dogs={[coco]} />);
    fireEvent.press(screen.getByRole('button', { name: /pee/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
      );
    });
  });

  it.each([
    ['walkId null', { walkId: null }, {}],
    ['record pending', {}, { recordIsPending: true }],
  ] as const)('buttons disabled when %s', (_label, storeOverrides, opts) => {
    setupMocks(storeOverrides, opts);
    render(<WalkEventActions dogs={[coco]} />);
    expect(screen.getByRole('button', { name: /pee/i })).toBeDisabled();
  });
});

describe('WalkEventActions — multi dog', () => {
  it('renders per-dog rows with pee and poop icon buttons', () => {
    render(<WalkEventActions dogs={[coco, momo]} />);
    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Momo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Coco Pee' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Momo Poop' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Momo Photo' })).toBeNull();
  });

  it('per-dog pee button records for the selected dog', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'event-10' });
    render(<WalkEventActions dogs={[coco, momo]} />);
    fireEvent.press(screen.getByRole('button', { name: 'Momo Pee' }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ dogId: 'dog-2', eventType: 'pee' }),
      );
    });
  });

  it('shows per-dog event counts', () => {
    setupMocks({
      events: [
        {
          id: 'e1',
          walkId: 'walk-123',
          dogId: 'dog-1',
          eventType: 'pee',
          occurredAt: '',
          lat: null,
          lng: null,
          photoUrl: null,
        },
        {
          id: 'e2',
          walkId: 'walk-123',
          dogId: 'dog-1',
          eventType: 'pee',
          occurredAt: '',
          lat: null,
          lng: null,
          photoUrl: null,
        },
        {
          id: 'e3',
          walkId: 'walk-123',
          dogId: 'dog-1',
          eventType: 'poo',
          occurredAt: '',
          lat: null,
          lng: null,
          photoUrl: null,
        },
      ],
    });
    render(<WalkEventActions dogs={[coco, momo]} />);
    expect(screen.getByText('💧 2 · 💩 1')).toBeTruthy();
    expect(screen.getByText('💧 0 · 💩 0')).toBeTruthy();
  });
});
