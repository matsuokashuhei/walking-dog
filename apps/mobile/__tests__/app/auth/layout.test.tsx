import { render } from '@testing-library/react-native';
import AuthLayout from '../../../app/(auth)/_layout';

const mockStack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: (props: unknown) => {
    mockStack(props);
    return null;
  },
}));

describe('AuthLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a stack slide transition for sign-in to sign-up navigation', () => {
    render(<AuthLayout />);

    expect(mockStack).toHaveBeenCalledWith({
      screenOptions: {
        animation: 'slide_from_right',
        headerShown: false,
      },
    });
  });
});
