import { render, screen } from '@testing-library/react-native';
import { ProfileCard } from './ProfileCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'settings.emailPlaceholder': 'mio@walk.app',
        'settings.viewProfile': 'View profile',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('ProfileCard', () => {
  it('renders the display name, email, and view profile link', () => {
    render(<ProfileCard displayName="Mio Tanaka" />);
    expect(screen.getByText('Mio Tanaka')).toBeTruthy();
    expect(screen.getByText('mio@walk.app')).toBeTruthy();
    expect(screen.getByText('View profile')).toBeTruthy();
  });

  it('uses the first letter of the display name as the avatar initial', () => {
    render(<ProfileCard displayName="mio" />);
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('falls back to ? when displayName is null', () => {
    render(<ProfileCard displayName={null} />);
    expect(screen.getByText('?')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });
});
