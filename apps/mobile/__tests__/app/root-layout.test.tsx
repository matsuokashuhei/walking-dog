import { render } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';

const mockScreen = jest.fn((_props: unknown) => null);
const mockReplace = jest.fn();
const mockInitializeAuth = jest.fn();
const mockInitializeSettings = jest.fn();

jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  Stack.Screen = (props: unknown) => mockScreen(props);
  return {
    DarkTheme: {},
    DefaultTheme: {},
    Stack,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useRouter: () => ({ replace: mockReplace }),
    useSegments: () => ['(tabs)'],
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-reanimated', () => ({}));
jest.mock('@/lib/i18n', () => ({}));
jest.mock('@/lib/walk/background-location-task', () => ({}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/lib/providers', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      initialize: mockInitializeAuth,
      isAuthenticated: true,
      isLoading: false,
      networkError: null,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ initialize: mockInitializeSettings }),
}));

jest.mock('@/components/ui/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

jest.mock('@/components/ui/ErrorScreen', () => ({
  ErrorScreen: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the user stack without a transition so edit matches Dog edit', () => {
    render(<RootLayout />);

    expect(mockScreen).toHaveBeenCalledWith({
      name: 'user',
      options: { headerShown: false, animation: 'none' },
    });
  });

  it('presents /dogs/new quickly from the bottom at the root stack boundary', () => {
    render(<RootLayout />);

    const dogsScreen = mockScreen.mock.calls
      .map(([props]) => props as { name: string; options: unknown })
      .find((props) => props.name === 'dogs');

    expect(typeof dogsScreen?.options).toBe('function');
    const options = dogsScreen?.options as (args: { route: unknown }) => unknown;
    expect(options({ route: { params: { screen: 'new' } } })).toEqual({
      headerShown: false,
      animation: 'slide_from_bottom',
      animationDuration: 220,
    });
    expect(options({ route: { params: { screen: '[id]' } } })).toEqual({
      headerShown: false,
    });
  });
});
