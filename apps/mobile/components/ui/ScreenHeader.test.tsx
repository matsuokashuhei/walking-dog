import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { changeLanguage } from 'i18next';
import { colors, layout, spacing, typography } from '@/theme/tokens';
import { ScreenHeader } from './ScreenHeader';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe('ScreenHeader', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    await changeLanguage('en');
  });

  it('renders the default largeTitle title as a header with large title typography', () => {
    render(<ScreenHeader title="My Dogs" testID="header" />);

    const title = screen.getByRole('header', { name: 'My Dogs' });
    const header = getTestNode('header');

    expect(title).toBeTruthy();
    expect(flattenStyle(title.props.style).fontSize).toBe(
      typography.largeTitle.fontSize,
    );
    expect(header.children).toHaveLength(2);
  });

  it('keeps the largeTitle action row and slot frames when no actions are provided', () => {
    render(<ScreenHeader title="Me" testID="header" />);

    const header = getTestNode('header');
    const actionRow = childAt(header, 0);
    const leftSlot = screen.getByTestId('header-left-action-slot');
    const rightSlot = screen.getByTestId('header-right-action-slot');

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('header', { name: 'Me' })).toBeTruthy();
    expect(flattenStyle(actionRow.props.style).height).toBe(layout.navBar);
    expect(flattenStyle(leftSlot.props.style).minWidth).toBe(spacing.step60);
    expect(flattenStyle(rightSlot.props.style).minWidth).toBe(spacing.step60);
  });

  it('renders inline as one row with header title typography', () => {
    render(<ScreenHeader variant="inline" title="Edit dog" testID="header" />);

    const header = getTestNode('header');
    const title = screen.getByRole('header', { name: 'Edit dog' });

    expect(header.children).toHaveLength(1);
    expect(title).toBeTruthy();
    expect(flattenStyle(title.props.style).fontSize).toBe(typography.headline.fontSize);
  });

  it('renders the English back shortcut with chevron and calls router.back', () => {
    render(<ScreenHeader variant="inline" title="Members" leftAction="back" />);

    expect(screen.getByText('chevron.backward')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders the Japanese back shortcut label from i18n', async () => {
    await changeLanguage('ja');

    render(<ScreenHeader variant="inline" title="メンバー" leftAction="back" />);

    expect(screen.getByRole('button', { name: '戻る' })).toBeTruthy();
  });

  it('calls a custom left action once when pressed', () => {
    const onPress = jest.fn();
    render(
      <ScreenHeader
        variant="inline"
        title="Register dog"
        leftAction={{ label: 'Cancel', onPress }}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a strong right action with headline font weight', () => {
    render(
      <ScreenHeader
        variant="inline"
        title="Register dog"
        rightAction={{ label: 'Save', onPress: jest.fn(), strong: true }}
      />,
    );

    const label = screen.getByText('Save');

    expect(flattenStyle(label.props.style).fontWeight).toBe(
      typography.headline.fontWeight,
    );
  });

  it('disables a disabled right action visually and semantically', () => {
    const onPress = jest.fn();
    render(
      <ScreenHeader
        variant="inline"
        title="Register dog"
        rightAction={{ label: 'Save', onPress, disabled: true }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    const label = screen.getByText('Save');

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(flattenStyle(label.props.style).color).toBe(colors.light.textDisabled);
  });

  it('renders no buttons when both actions are null while keeping the header visible', () => {
    render(
      <ScreenHeader
        title="Me"
        leftAction={null}
        rightAction={null}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('header', { name: 'Me' })).toBeTruthy();
  });

  it('gives every action an accessibility role, label, hit slop, and 44pt target', () => {
    render(
      <ScreenHeader
        variant="inline"
        title="Edit dog"
        leftAction={{ label: 'Cancel', onPress: jest.fn() }}
        rightAction={{ label: 'Save', onPress: jest.fn() }}
      />,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const save = screen.getByRole('button', { name: 'Save' });

    expect(cancel.props.accessibilityLabel).toBe('Cancel');
    expect(save.props.accessibilityLabel).toBe('Save');
    expect(cancel.props.hitSlop).toBe(12);
    expect(save.props.hitSlop).toBe(12);
    expect(flattenStyle(cancel.props.style).minHeight).toBe(layout.navBar);
    expect(flattenStyle(save.props.style).minHeight).toBe(layout.navBar);
  });
});

interface TestNode {
  props: Record<string, unknown>;
  children: unknown[];
}

type StyleRecord = Record<string, unknown>;

function getTestNode(testID: string): TestNode {
  return screen.getByTestId(testID) as unknown as TestNode;
}

function childAt(node: TestNode, index: number): TestNode {
  return node.children[index] as TestNode;
}

function flattenStyle(style: unknown): StyleRecord {
  const flattened = StyleSheet.flatten(style);
  return flattened && typeof flattened === 'object' ? (flattened as StyleRecord) : {};
}
