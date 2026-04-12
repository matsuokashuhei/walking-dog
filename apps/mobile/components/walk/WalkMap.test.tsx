import { render, screen } from '@testing-library/react-native';
import { WalkMap } from './WalkMap';
import type { WalkEvent } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
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

  const MockPolyline = () => React.createElement(View, null);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) => selector({ points: [] }),
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

describe('WalkMap', () => {
  it('renders without events prop', () => {
    render(<WalkMap />);
    expect(screen.getByTestId('MapView')).toBeTruthy();
  });

  it('renders event markers for events with lat/lng', () => {
    render(<WalkMap events={[peeEvent]} />);
    expect(screen.getByTestId('event-marker-event-1')).toBeTruthy();
  });

  it('does not render marker for events without lat/lng', () => {
    render(<WalkMap events={[photoEventNoGps]} />);
    expect(screen.queryByTestId('event-marker-event-2')).toBeNull();
  });

  it('renders markers for multiple events', () => {
    render(<WalkMap events={[peeEvent, { ...peeEvent, id: 'event-3', lat: 35.682, lng: 139.768 }]} />);
    expect(screen.getByTestId('event-marker-event-1')).toBeTruthy();
    expect(screen.getByTestId('event-marker-event-3')).toBeTruthy();
  });
});
