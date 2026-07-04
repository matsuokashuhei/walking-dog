import { render } from '@testing-library/react-native';
import DogDetailLayout from '../../../app/dogs/[id]/_layout';

const mockScreen = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => {
  const { View } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  Stack.Screen = (props: unknown) => mockScreen(props);
  return { Stack };
});

describe('DogDetailLayout', () => {
  beforeEach(() => {
    mockScreen.mockClear();
  });

  it('switches to edit without a stack transition animation', () => {
    render(<DogDetailLayout />);

    expect(mockScreen).toHaveBeenCalledWith({
      name: 'edit',
      options: { headerShown: false, animation: 'none' },
    });
  });
});
