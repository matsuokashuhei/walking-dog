import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from './TextInput';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('TextInput', () => {
  it('renders the label', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('calls onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    render(<TextInput label="Email" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'foo@example.com');
    expect(onChangeText).toHaveBeenCalledWith('foo@example.com');
  });

  it('shows an error message when error prop is provided', () => {
    render(<TextInput label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('hides the error message when error prop is absent', () => {
    render(<TextInput label="Email" />);
    expect(screen.queryByText('Required')).toBeNull();
  });

  it('passes value prop through to the native input', () => {
    render(<TextInput label="Email" value="initial" />);
    expect(screen.getByLabelText('Email').props.value).toBe('initial');
  });

  it('renders inline labelPosition with label and input accessible', () => {
    render(
      <TextInput label="Email" labelPosition="inline" value="coco@walk.app" />,
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('coco@walk.app');
  });

  it('inline variant renders separator when separator prop is true', () => {
    render(
      <TextInput label="Email" labelPosition="inline" separator testID="email-row" />,
    );
    expect(screen.getByTestId('email-row-separator')).toBeTruthy();
  });

  it('inline variant does not render separator when separator prop is false', () => {
    render(
      <TextInput label="Password" labelPosition="inline" testID="pwd-row" />,
    );
    expect(screen.queryByTestId('pwd-row-separator')).toBeNull();
  });
});
