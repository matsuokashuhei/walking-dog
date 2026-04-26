import { fireEvent, render, screen } from '@testing-library/react-native';
import { NoDogsBody } from './NoDogsBody';

const mockPush = jest.fn();

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
}));

describe('NoDogsBody', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders title, body and CTA button', () => {
    render(<NoDogsBody />);
    expect(screen.getByText('No dogs yet')).toBeTruthy();
    expect(screen.getByText(/Add a dog to your pack/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add your first dog' })).toBeTruthy();
  });

  it('navigates to /dogs/new when CTA is pressed', () => {
    render(<NoDogsBody />);
    fireEvent.press(screen.getByRole('button', { name: 'Add your first dog' }));
    expect(mockPush).toHaveBeenCalledWith('/dogs/new');
  });
});
