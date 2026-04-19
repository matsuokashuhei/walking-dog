import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { LiquidGlassTabBar } from './liquid-glass-tab-bar';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return { BlurView: View };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
  };
});

type RouteLike = { key: string; name: string; params?: object };

type BuildOpts = {
  activeIndex?: number;
  hiddenRouteIndex?: number;
  navigate?: jest.Mock;
  emit?: jest.Mock;
};

function buildProps({
  activeIndex = 0,
  hiddenRouteIndex,
  navigate = jest.fn(),
  emit = jest.fn().mockReturnValue({ defaultPrevented: false }),
}: BuildOpts = {}): BottomTabBarProps {
  const routes: RouteLike[] = [
    { key: 'dogs-1', name: 'dogs' },
    { key: 'walk-1', name: 'walk' },
    { key: 'settings-1', name: 'settings' },
  ];
  const titles = ['Dogs', 'Walk', 'Me'];

  const descriptors = Object.fromEntries(
    routes.map((route, index) => [
      route.key,
      {
        options: {
          title: titles[index],
          tabBarIcon: ({ color }: { color: string }) => (
            <Text>{`icon-${titles[index]}-${color}`}</Text>
          ),
          tabBarStyle: index === hiddenRouteIndex ? { display: 'none' as const } : undefined,
        },
      },
    ]),
  );

  return {
    state: {
      index: activeIndex,
      routes,
      key: 'tabs',
      routeNames: routes.map((r) => r.name),
      history: [],
      type: 'tab',
      stale: false,
    },
    descriptors,
    navigation: {
      navigate,
      emit,
    },
    insets: { top: 0, right: 0, bottom: 34, left: 0 },
  } as unknown as BottomTabBarProps;
}

describe('LiquidGlassTabBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a button for each route with its title as accessibility label', () => {
    render(<LiquidGlassTabBar {...buildProps()} />);
    expect(screen.getByRole('button', { name: 'Dogs' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Walk' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Me' })).toBeTruthy();
  });

  it('marks only the focused tab as selected', () => {
    render(<LiquidGlassTabBar {...buildProps({ activeIndex: 1 })} />);
    expect(screen.getByRole('button', { name: 'Dogs' }).props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByRole('button', { name: 'Walk' }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('navigates to the route name when an unfocused tab is pressed', () => {
    const navigate = jest.fn();
    const emit = jest.fn().mockReturnValue({ defaultPrevented: false });
    render(<LiquidGlassTabBar {...buildProps({ activeIndex: 0, navigate, emit })} />);
    fireEvent.press(screen.getByRole('button', { name: 'Walk' }));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'walk-1' }),
    );
    expect(navigate).toHaveBeenCalledWith('walk', undefined);
  });

  it('does not navigate when the focused tab is pressed again', () => {
    const navigate = jest.fn();
    render(<LiquidGlassTabBar {...buildProps({ activeIndex: 1, navigate })} />);
    fireEvent.press(screen.getByRole('button', { name: 'Walk' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders nothing when the focused route sets tabBarStyle.display to "none"', () => {
    const { toJSON } = render(
      <LiquidGlassTabBar {...buildProps({ activeIndex: 1, hiddenRouteIndex: 1 })} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('fires a light haptic on press-in on iOS', () => {
    render(<LiquidGlassTabBar {...buildProps()} />);
    fireEvent(screen.getByRole('button', { name: 'Walk' }), 'pressIn');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
