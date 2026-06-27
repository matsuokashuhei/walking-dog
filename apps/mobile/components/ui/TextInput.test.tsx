import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

  it('inline variant highlights the row while focused', () => {
    render(
      <TextInput label="Email" labelPosition="inline" testID="email-row" />,
    );

    fireEvent(screen.getByLabelText('Email'), 'focus');

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

    const input = screen.getByLabelText('Email');

    fireEvent(input, 'focus');
    fireEvent(input, 'blur');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('inline variant does not render separator when separator prop is false', () => {
    render(
      <TextInput label="Password" labelPosition="inline" testID="pwd-row" />,
    );
    expect(screen.queryByTestId('pwd-row-separator')).toBeNull();
  });
});
