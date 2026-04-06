import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../../../app/(tabs)/index';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/components/walk/WalkHistoryItem', () => ({
  WalkHistoryItem: () => null,
}));

describe('HomeScreen', () => {
  it('renders editorial hero heading', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Ready for the morning run?')).toBeTruthy();
  });

  it('renders Start Walk CTA button', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('button', { name: 'Start Walk →' })).toBeTruthy();
  });

  it('renders walk history section title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Recent Walks')).toBeTruthy();
  });

  it('renders empty state when no walks', () => {
    render(<HomeScreen />);
    expect(screen.getByText('No walks yet. Start your first walk!')).toBeTruthy();
  });
});
