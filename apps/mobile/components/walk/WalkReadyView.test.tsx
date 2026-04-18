import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkReadyView } from './WalkReadyView';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/components/walk/WalkHistoryItem', () => ({
  WalkHistoryItem: () => null,
}));

describe('WalkReadyView', () => {
  it('renders the Precise start hint', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(
      screen.getByText("Tap to begin. We'll follow your route."),
    ).toBeTruthy();
  });

  it('renders the 200×200 circular START button', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'START' })).toBeTruthy();
  });

  it('renders walk history section title', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByText('Recent Walks')).toBeTruthy();
  });

  it('renders empty state when no walks', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByText('No walks yet. Start your first walk!')).toBeTruthy();
  });

  it('invokes onStartPress when START is pressed', () => {
    const onStartPress = jest.fn();
    render(<WalkReadyView onStartPress={onStartPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'START' }));
    expect(onStartPress).toHaveBeenCalledTimes(1);
  });
});
