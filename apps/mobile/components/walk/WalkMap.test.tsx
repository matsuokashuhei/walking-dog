import * as Location from 'expo-location';
import { render, screen, waitFor } from '@testing-library/react-native';
import { WalkMap } from './WalkMap';
import type { WalkEvent, WalkPoint } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const MockMapView = ({
    children,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
    region?: unknown;
    showsUserLocation?: boolean;
    followsUserLocation?: boolean;
  }) => React.createElement(View, { testID: testID ?? 'MapView', ...props }, children);

  const MockMarker = ({
    testID,
    accessibilityLabel,
  }: {
    testID?: string;
    accessibilityLabel?: string;
  }) => React.createElement(View, { testID, accessibilityLabel });

  const MockPolyline = () => React.createElement(View, null);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

let mockStorePoints: WalkPoint[] = [];
let mockStoreEvents: WalkEvent[] = [];

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: { points: WalkPoint[]; events: WalkEvent[] }) => unknown) =>
    selector({ points: mockStorePoints, events: mockStoreEvents }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const peeEvent: WalkEvent = {
  id: 'event-1',
  walkId: 'walk-123',
  dogId: 'dog-1',
  eventType: 'pee',
  occurredAt: '2026-04-12T10:12:00Z',
  lat: 35.6812,
  lng: 139.7671,
  photoUrl: null,
};

const photoEventNoGps: WalkEvent = {
  id: 'event-2',
  walkId: 'walk-123',
  dogId: null,
  eventType: 'photo',
  occurredAt: '2026-04-12T10:25:00Z',
  lat: null,
  lng: null,
  photoUrl: 'https://cdn.example.com/walks/walk-123/photo.jpg',
};

beforeEach(() => {
  mockStorePoints = [];
  mockStoreEvents = [];
  jest.clearAllMocks();
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 35.6895, longitude: 139.6917 },
    timestamp: new Date('2026-04-12T10:00:00Z').getTime(),
  });
});

describe('WalkMap', () => {
  it('renders without any recorded events', () => {
    render(<WalkMap />);
    expect(screen.getByTestId('MapView')).toBeTruthy();
  });

  it('shows and follows the user location in preview mode', async () => {
    render(<WalkMap mode="preview" />);
    const map = screen.getByTestId('MapView');
    expect(map.props.showsUserLocation).toBe(true);
    expect(map.props.followsUserLocation).toBe(true);
    await waitFor(() => {
      expect(screen.getByTestId('MapView').props.region).toBeDefined();
    });
  });

  it('centers the preview map on the current location when foreground permission is granted', async () => {
    render(<WalkMap mode="preview" />);

    await waitFor(() => {
      expect(screen.getByTestId('MapView').props.region).toEqual({
        latitude: 35.6895,
        longitude: 139.6917,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    });

    expect(Location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it('requests foreground permission before centering the preview map when needed', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });

    render(<WalkMap mode="preview" />);

    await waitFor(() => {
      expect(screen.getByTestId('MapView').props.region).toEqual({
        latitude: 35.6895,
        longitude: 139.6917,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('renders event markers for store events with lat/lng', () => {
    mockStoreEvents = [peeEvent];
    render(<WalkMap />);
    expect(screen.getByTestId('event-marker-event-1')).toBeTruthy();
  });

  it('does not render marker for events without lat/lng', () => {
    mockStoreEvents = [photoEventNoGps];
    render(<WalkMap />);
    expect(screen.queryByTestId('event-marker-event-2')).toBeNull();
  });

  it('renders markers for multiple events', () => {
    mockStoreEvents = [
      peeEvent,
      { ...peeEvent, id: 'event-3', lat: 35.682, lng: 139.768 },
    ];
    render(<WalkMap />);
    expect(screen.getByTestId('event-marker-event-1')).toBeTruthy();
    expect(screen.getByTestId('event-marker-event-3')).toBeTruthy();
  });
});
