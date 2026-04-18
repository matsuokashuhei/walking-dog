import { render, screen } from '@testing-library/react-native';
import { AppMark } from './AppMark';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Path: 'Path',
}));

describe('AppMark', () => {
  it('exposes an accessible image role with the app name as label', () => {
    render(<AppMark />);
    expect(screen.getByRole('image', { name: /walking dog/i })).toBeTruthy();
  });
});
