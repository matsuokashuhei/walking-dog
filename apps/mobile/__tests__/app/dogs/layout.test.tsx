import { render } from '@testing-library/react-native';
import DogsLayout from '../../../app/dogs/_layout';

const mockScreen = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  Stack.Screen = (props: unknown) => mockScreen(props);
  return { Stack };
});

describe('DogsLayout', () => {
  beforeEach(() => {
    mockScreen.mockClear();
  });

  it('presents the new dog screen quickly from the bottom', () => {
    render(<DogsLayout />);

    expect(mockScreen).toHaveBeenCalledWith({
      name: 'new',
      options: { headerShown: false, animation: 'slide_from_bottom', animationDuration: 220 },
    });
  });
});
