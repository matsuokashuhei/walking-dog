import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'walk-1' }),
}));

jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MockMapView = (props: Record<string, unknown>) => <View {...props} />;
  const MockPolyline = (props: Record<string, unknown>) => <View {...props} />;
  MockMapView.displayName = 'MapView';
  MockPolyline.displayName = 'Polyline';
  return {
    __esModule: true,
    default: MockMapView,
    Polyline: MockPolyline,
  };
});

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const mockUseWalk = jest.fn();
jest.mock('@/hooks/use-walks', () => ({
  useWalk: (...args: unknown[]) => mockUseWalk(...args),
}));

// eslint-disable-next-line import/first
import WalkDetailScreen from '../../../app/walks/[id]';

const baseWalk = {
  id: 'walk-1',
  dogs: [{ id: 'dog-1', name: 'Buddy', breed: null, gender: null, birthDate: null, photoUrl: null, createdAt: '2026-01-01' }],
  status: 'FINISHED' as const,
  distanceM: 1500,
  durationSec: 1800,
  startedAt: '2026-04-04T09:00:00Z',
  endedAt: '2026-04-04T09:30:00Z',
  points: [],
};

describe('WalkDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays both start and end time when endedAt is present', () => {
    mockUseWalk.mockReturnValue({ data: baseWalk, isLoading: false });
    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    const children = timeText.props.children;
    expect(Array.isArray(children) ? children.filter(Boolean) : [children]).toHaveLength(2);
  });

  it('displays only start time when endedAt is null', () => {
    mockUseWalk.mockReturnValue({
      data: { ...baseWalk, endedAt: null },
      isLoading: false,
    });
    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    const children = timeText.props.children;
    const visibleParts = Array.isArray(children) ? children.filter(Boolean) : [children];
    expect(visibleParts).toHaveLength(1);
  });

  it('has accessibilityLabel on time element', () => {
    mockUseWalk.mockReturnValue({ data: baseWalk, isLoading: false });
    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    expect(timeText.props.accessibilityLabel).toBeTruthy();
  });

  it('does not render walk content when isLoading is true', () => {
    mockUseWalk.mockReturnValue({ data: undefined, isLoading: true });
    render(<WalkDetailScreen />);

    expect(screen.queryByTestId('walk-time')).toBeNull();
  });

  it('does not render walk content when data is undefined', () => {
    mockUseWalk.mockReturnValue({ data: undefined, isLoading: false });
    render(<WalkDetailScreen />);

    expect(screen.queryByTestId('walk-time')).toBeNull();
  });

  it('displays walk-time element in dark mode', () => {
    mockUseWalk.mockReturnValue({ data: baseWalk, isLoading: false });

    jest.resetModules();
    jest.doMock('@/hooks/use-color-scheme', () => ({
      useColorScheme: () => 'dark',
    }));

    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    expect(timeText).toBeTruthy();
  });
});
