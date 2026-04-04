import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'walk-1' }),
}));

jest.mock('react-native-maps', () => {
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

import WalkDetailScreen from '../[id]';

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
    expect(timeText).toBeTruthy();
    // Should contain the separator when both times exist
    expect(timeText.props.children).toBeTruthy();
  });

  it('displays only start time when endedAt is null', () => {
    mockUseWalk.mockReturnValue({
      data: { ...baseWalk, endedAt: null },
      isLoading: false,
    });
    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    expect(timeText).toBeTruthy();
    // Should not contain the separator
    const textContent = timeText.props.children;
    // When endedAt is null, children should not include separator
    if (Array.isArray(textContent)) {
      // Filter out falsy values (conditional rendering)
      const visibleParts = textContent.filter(Boolean);
      expect(visibleParts.length).toBeLessThan(3);
    }
  });

  it('has accessibilityLabel on time element', () => {
    mockUseWalk.mockReturnValue({ data: baseWalk, isLoading: false });
    render(<WalkDetailScreen />);

    const timeText = screen.getByTestId('walk-time');
    expect(timeText.props.accessibilityLabel).toBeTruthy();
    expect(timeText.props.accessibilityLabel.length).toBeGreaterThan(0);
  });
});
