import { render } from '@testing-library/react-native';
import DogsLayout from '../../../app/(tabs)/dogs/_layout';

const mockStack = jest.fn((_props: unknown) => null);
const mockScreen = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Stack = (props: { children?: React.ReactNode }) => {
    mockStack(props);
    return <View>{props.children}</View>;
  };
  Stack.Screen = (props: unknown) => mockScreen(props);
  return { Stack };
});

describe('DogsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('owns the Dogs tab stack screens with inline chrome', () => {
    render(<DogsLayout />);

    expect(mockStack).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: { headerShown: false },
      }),
    );
    expect(mockScreen.mock.calls.map(([props]) => props)).toEqual([
      { name: 'index' },
      { name: 'new' },
      { name: '[id]' },
    ]);
  });
});
