import * as Location from 'expo-location';
import { render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { WalkMap } from './WalkMap';
import { spacing } from '@/theme/tokens';
import type { Dog, WalkEvent, WalkPoint } from '@/types/graphql';

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

  const MockMapView = React.forwardRef(
    (
      {
        children,
        testID,
        ...props
      }: {
        children?: React.ReactNode;
        testID?: string;
        region?: unknown;
        showsUserLocation?: boolean;
        followsUserLocation?: boolean;
      },
      ref: React.Ref<{ animateToRegion: jest.Mock }>,
    ) => {
      React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
      return React.createElement(View, { testID: testID ?? 'MapView', ...props }, children);
    },
  );
  MockMapView.displayName = 'MapView';

  const MockMarker = ({
    testID,
    accessibilityLabel,
    children,
    ...props
  }: {
    testID?: string;
    accessibilityLabel?: string;
    children?: React.ReactNode;
  }) => React.createElement(View, { testID, accessibilityLabel, ...props }, children);

  const MockPolyline = () => React.createElement(View, null);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

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

const firstPoint: WalkPoint = {
  lat: 35.6812,
  lng: 139.7671,
  recordedAt: '2026-04-12T10:00:00Z',
};

const secondPoint: WalkPoint = {
  lat: 35.682,
  lng: 139.768,
  recordedAt: '2026-04-12T10:01:00Z',
};

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Toy Poodle',
  gender: null,
  birthday: null,
  photoUrl: 'https://cdn.example.com/dogs/coco.jpg',
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: 'Shiba Inu',
  gender: null,
  birthday: null,
  photoUrl: 'https://cdn.example.com/dogs/momo.jpg',
  createdAt: '2026-01-02',
};

const pochi: Dog = {
  id: 'dog-3',
  name: 'Pochi',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: 'https://cdn.example.com/dogs/pochi.jpg',
  createdAt: '2026-01-03',
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

  it('renders the latest recorded point as a dog avatar current-location marker', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[coco]} />);

    const marker = screen.getByTestId('current-location-marker');
    expect(marker.props.coordinate).toEqual({
      latitude: firstPoint.lat,
      longitude: firstPoint.lng,
    });
    expect(marker.props.anchor).toEqual({ x: 0.5, y: 0.5 });
    expect(screen.getByTestId('current-location-avatar-dog-1').props.source).toBe(
      coco.photoUrl,
    );
  });

  it('renders only the first two dog avatars for a group walk current location', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[coco, momo, pochi]} />);

    expect(screen.getByTestId('current-location-avatar-dog-1').props.source).toBe(
      coco.photoUrl,
    );
    expect(screen.getByTestId('current-location-avatar-dog-2').props.source).toBe(
      momo.photoUrl,
    );
    expect(screen.queryByTestId('current-location-avatar-dog-3')).toBeNull();
  });

  it('renders the map current-location avatar at half the original marker scale', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[coco]} />);

    const avatarStyle = StyleSheet.flatten(
      screen.getByTestId('current-location-avatar-dog-1').props.style,
    );

    expect(avatarStyle).toEqual(
      expect.objectContaining({
        width: spacing.step44 / 2,
        height: spacing.step44 / 2,
        borderWidth: spacing.xs / 4,
      }),
    );
  });

  it('uses the existing app icon fallback for dogs without a profile image', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[{ ...coco, photoUrl: null }]} />);

    expect(screen.getByTestId('current-location-avatar-dog-1').props.source).toEqual(
      require('@/assets/images/icon.png'),
    );
  });

  it('does not enable the native user-location dot when rendering a dog marker', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[coco]} />);

    expect(screen.getByTestId('MapView').props.showsUserLocation).toBe(false);
  });

  it('does not render a current-location marker before the first GPS point', () => {
    render(<WalkMap dogs={[coco]} />);

    expect(screen.queryByTestId('current-location-marker')).toBeNull();
  });

  it('does not render a current-location marker when no dogs are available', () => {
    mockStorePoints = [firstPoint];
    render(<WalkMap dogs={[]} />);

    expect(screen.queryByTestId('current-location-marker')).toBeNull();
  });

  it('keeps following the latest recorded point after replacing native user following', () => {
    mockStorePoints = [firstPoint, secondPoint];
    render(<WalkMap dogs={[coco]} />);

    expect(screen.getByTestId('current-location-marker').props.coordinate).toEqual({
      latitude: secondPoint.lat,
      longitude: secondPoint.lng,
    });
    expect(screen.getByTestId('MapView').props.followsUserLocation).toBe(false);
  });
});
