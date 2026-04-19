import { ActionSheetIOS } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesSection } from './PreferencesSection';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

const mockSetTheme = jest.fn();
const mockSetLanguage = jest.fn();
const mockSetUnits = jest.fn();

jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      theme: 'light',
      language: 'en',
      units: 'km',
      setTheme: mockSetTheme,
      setLanguage: mockSetLanguage,
      setUnits: mockSetUnits,
    }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'settings.sectionLabel.preferences': 'PREFERENCES',
        'settings.language': 'Language',
        'settings.units': 'Units',
        'settings.unitsKm': 'km',
        'settings.unitsMile': 'mile',
        'settings.notifications': 'Notifications',
        'settings.notificationsValue': 'On',
        'settings.appearance': 'Appearance',
        'settings.themeLight': 'Light',
        'settings.themeDark': 'Dark',
        'settings.themeAuto': 'Auto',
        'settings.cancel': 'Cancel',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('PreferencesSection', () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
    mockSetLanguage.mockReset();
    mockSetUnits.mockReset();
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(
      (_config, cb) => cb(1),
    );
  });

  it('renders all four preference rows', () => {
    render(<PreferencesSection />);
    expect(screen.getByText('PREFERENCES')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('Units')).toBeTruthy();
    expect(screen.getAllByText('km').length).toBeGreaterThan(0);
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('On')).toBeTruthy();
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
  });

  it('opens the language ActionSheet and applies the selection', () => {
    render(<PreferencesSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Language' }));
    expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalled();
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
  });

  it('opens the units ActionSheet and applies mile', () => {
    render(<PreferencesSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Units' }));
    expect(mockSetUnits).toHaveBeenCalledWith('mile');
  });

  it('opens the appearance ActionSheet and applies the theme', () => {
    render(<PreferencesSection />);
    fireEvent.press(screen.getByRole('button', { name: 'Appearance' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
