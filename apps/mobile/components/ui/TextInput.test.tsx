import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TextInput } from './TextInput';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('TextInput', () => {
  it('uses the label as the default placeholder without rendering visible label text', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.queryByText('Email')).toBeNull();
  });

  it('prefers an explicit placeholder over the label', () => {
    render(<TextInput label="Email" placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Email')).toBeNull();
  });

  it('calls onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    render(<TextInput label="Email" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'foo@example.com');
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
    expect(screen.getByPlaceholderText('Email').props.value).toBe('initial');
  });

  it('re-seeds the native input when the parent value changes externally', () => {
    const { rerender } = render(<TextInput label="Email" value="initial" />);

    rerender(<TextInput label="Email" value="reset@example.com" />);

    expect(screen.getByPlaceholderText('Email').props.value).toBe('reset@example.com');
  });

  it('renders inline labelPosition without a visible label and with an input placeholder', () => {
    render(
      <TextInput label="Email" labelPosition="inline" value="coco@walk.app" />,
    );
    expect(screen.queryByText('Email')).toBeNull();
    expect(screen.getByPlaceholderText('Email').props.value).toBe('coco@walk.app');
  });

  it('does not render a manual separator when separator prop is true', () => {
    render(
      <TextInput label="Email" labelPosition="inline" separator testID="email-row" />,
    );
    expect(screen.queryByTestId('email-row-separator')).toBeNull();
  });

  it('inline variant highlights the row while focused', () => {
    render(
      <TextInput label="Email" labelPosition="inline" testID="email-row" />,
    );

    fireEvent(screen.getByPlaceholderText('Email'), 'focus');

    const rowStyle = StyleSheet.flatten(screen.getByTestId('email-row-container').props.style);
    expect(rowStyle.borderColor).not.toBe('transparent');
  });

  it('forwards focus and blur events while updating focused state', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    render(
      <TextInput
        label="Email"
        labelPosition="inline"
        testID="email-row"
        onBlur={onBlur}
        onFocus={onFocus}
      />,
    );

    const input = screen.getByPlaceholderText('Email');

    fireEvent(input, 'focus');
    fireEvent(input, 'blur');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('does not render a manual separator when separator prop is false', () => {
    render(
      <TextInput label="Password" labelPosition="inline" testID="pwd-row" />,
    );
    expect(screen.queryByTestId('pwd-row-separator')).toBeNull();
  });
});
