import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LegalSection } from './LegalSection';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'settings.sectionLabel.legal': 'LEGAL',
        'settings.terms': 'Terms of Service',
        'settings.privacy': 'Privacy Policy',
        'settings.about': 'About',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('LegalSection', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the three legal rows and app version', () => {
    render(<LegalSection />);
    expect(screen.getByText('LEGAL')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText(/^v\d/)).toBeTruthy();
  });

  it('opens the terms URL when tapped', () => {
    render(<LegalSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Terms of Service' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://walk.app/terms');
  });

  it('opens the privacy URL when tapped', () => {
    render(<LegalSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://walk.app/privacy');
  });
});
