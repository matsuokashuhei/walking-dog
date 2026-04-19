import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SignOutRow } from './SignOutRow';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const mockSignOut = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'settings.signOut': 'Sign Out',
        'settings.signOutConfirm': 'Are you sure?',
        'settings.cancel': 'Cancel',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SignOutRow', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('calls signOut after confirming the dialog', async () => {
    render(<SignOutRow />);

    fireEvent.press(screen.getAllByRole('button', { name: 'Sign Out' })[0]);

    const confirmButtons = await screen.findAllByRole('button', { name: 'Sign Out' });
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
