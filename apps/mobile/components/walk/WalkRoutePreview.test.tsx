import { render, screen } from '@testing-library/react-native';
import { WalkRoutePreview } from './WalkRoutePreview';
import type { WalkPoint } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const MockMapView = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => React.createElement(View, { testID: testID ?? 'MapView' }, children);

  const MockMarker = ({
    children,
    testID,
    accessibilityLabel,
  }: {
    children?: React.ReactNode;
    testID?: string;
    accessibilityLabel?: string;
  }) => React.createElement(View, { testID, accessibilityLabel }, children);

  const MockPolyline = ({ testID }: { testID?: string }) =>
    React.createElement(View, { testID: testID ?? 'Polyline' });

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

const p1: WalkPoint = { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-23T10:00:00Z' };
const p2: WalkPoint = { lat: 35.682, lng: 139.768, recordedAt: '2026-03-23T10:05:00Z' };

describe('WalkRoutePreview', () => {
  it('shows the three metric pills', () => {
    render(<WalkRoutePreview points={[p1, p2]} totalDistanceM={1420} elapsedSec={1458} />);
    expect(screen.getByText('1.42 km')).toBeTruthy();
    expect(screen.getByText('24:18')).toBeTruthy();
    expect(screen.getByText(/\d+'\d{2}"\/km/)).toBeTruthy();
  });

  it('renders start and end markers when points has 2+ entries', () => {
    render(<WalkRoutePreview points={[p1, p2]} totalDistanceM={1420} elapsedSec={1458} />);
    expect(screen.getByTestId('route-preview-start')).toBeTruthy();
    expect(screen.getByTestId('route-preview-end')).toBeTruthy();
  });

  it('renders only the start marker when fewer than 2 points exist', () => {
    render(<WalkRoutePreview points={[p1]} totalDistanceM={0} elapsedSec={0} />);
    expect(screen.getByTestId('route-preview-start')).toBeTruthy();
    expect(screen.queryByTestId('route-preview-end')).toBeNull();
  });

  it('still shows pills when there are zero points', () => {
    render(<WalkRoutePreview points={[]} totalDistanceM={0} elapsedSec={0} />);
    expect(screen.getByText('0 m')).toBeTruthy();
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
