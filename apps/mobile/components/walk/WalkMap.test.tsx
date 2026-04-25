import { render, screen } from '@testing-library/react-native';
import { WalkMap } from './WalkMap';
import type { WalkEvent, WalkPoint } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const MockMapView = ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(View, { testID: testID ?? 'MapView' }, children);

  const MockMarker = ({
    testID,
    accessibilityLabel,
  }: {
    testID?: string;
    accessibilityLabel?: string;
  }) => React.createElement(View, { testID, accessibilityLabel });

  const MockPolyline = ({ testID, ...props }: { testID?: string }) =>
    React.createElement(View, { testID, ...props });

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
});

describe('WalkMap', () => {
  it('renders without any recorded events', () => {
    render(<WalkMap />);
    expect(screen.getByTestId('MapView')).toBeTruthy();
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

  it('renders the dual route polylines with the updated active-walk styling', () => {
    mockStorePoints = [
      { lat: 35.68, lng: 139.76, recordedAt: '2026-04-12T10:00:00Z' },
      { lat: 35.681, lng: 139.761, recordedAt: '2026-04-12T10:01:00Z' },
    ];

    render(<WalkMap />);

    expect(screen.getByTestId('walk-route-highlight').props.strokeWidth).toBe(8);
    expect(screen.getByTestId('walk-route-line').props.strokeWidth).toBe(5);
  });
});
