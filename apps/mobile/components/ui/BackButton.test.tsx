import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { changeLanguage } from 'i18next';
import { colors, layout, spacing, typography } from '@/theme/tokens';
import { BackButton } from './BackButton';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe('BackButton', () => {
  beforeEach(async () => {
    await changeLanguage('en');
  });

  it('renders the shared back icon and English label', () => {
    const onPress = jest.fn();

    render(<BackButton onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Back' });
    const label = screen.getByText('Back');
    const style = StyleSheet.flatten(button.props.style);

    expect(screen.getByText('chevron.backward')).toBeTruthy();
    expect(style.minWidth).toBe(spacing.step60);
    expect(style.minHeight).toBe(layout.navBar);
    expect(StyleSheet.flatten(label.props.style).fontSize).toBe(
      typography.body.fontSize,
    );

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the Japanese back label from i18n', async () => {
    await changeLanguage('ja');

    render(<BackButton onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('supports custom labels and disabled state', () => {
    const onPress = jest.fn();

    render(<BackButton label="Dogs" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Dogs' });
    const label = screen.getByText('Dogs');

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(StyleSheet.flatten(label.props.style).color).toBe(
      colors.light.textDisabled,
    );
  });
});
