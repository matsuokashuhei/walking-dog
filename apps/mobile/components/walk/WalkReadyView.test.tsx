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
  it('renders hero heading', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByText('Ready for the morning run?')).toBeTruthy();
  });

  it('renders Start Walk CTA button', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Start Walk →' })).toBeTruthy();
  });

  it('renders walk history section title', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByText('Recent Walks')).toBeTruthy();
  });

  it('renders empty state when no walks', () => {
    render(<WalkReadyView onStartPress={jest.fn()} />);
    expect(screen.getByText('No walks yet. Start your first walk!')).toBeTruthy();
  });

  it('invokes onStartPress when CTA is pressed', () => {
    const onStartPress = jest.fn();
    render(<WalkReadyView onStartPress={onStartPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Start Walk →' }));
    expect(onStartPress).toHaveBeenCalledTimes(1);
  });
});
