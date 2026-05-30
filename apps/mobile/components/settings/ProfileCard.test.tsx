import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileCard } from './ProfileCard';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'settings.viewProfile': 'View profile',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('ProfileCard', () => {
  it('renders the display name and view profile link without a fake email', () => {
    render(<ProfileCard displayName="Mio Tanaka" avatarUrl={null} onPress={jest.fn()} />);

    expect(screen.getByText('Mio Tanaka')).toBeTruthy();
    expect(screen.getByText('View profile')).toBeTruthy();
    expect(screen.queryByText('mio@walk.app')).toBeNull();
  });

  it('uses the first letter of the display name as the avatar initial', () => {
    render(<ProfileCard displayName="mio" avatarUrl={null} onPress={jest.fn()} />);

    expect(screen.getByText('M')).toBeTruthy();
  });

  it('renders the avatar image when avatarUrl is present', () => {
    render(
      <ProfileCard
        displayName="Mio Tanaka"
        avatarUrl="https://example.com/mio.jpg"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId('settings-profile-card-avatar-image').props.source).toEqual({
      uri: 'https://example.com/mio.jpg',
    });
  });

  it('calls onPress when the profile card is pressed', () => {
    const onPress = jest.fn();
    render(<ProfileCard displayName="Mio Tanaka" avatarUrl={null} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'View profile' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to ? when displayName is null', () => {
    render(<ProfileCard displayName={null} avatarUrl={null} onPress={jest.fn()} />);

    expect(screen.getByText('?')).toBeTruthy();
    expect(screen.getByText('-')).toBeTruthy();
  });
});
