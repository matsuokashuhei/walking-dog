import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { OneTimePasswordInput } from './OneTimePasswordInput';
import { components } from '@/theme/tokens';

describe('OneTimePasswordInput', () => {
  it('sanitizes pasted input and completes once for the same eight digits', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();

    render(
      <OneTimePasswordInput
        value=""
        onChange={onChange}
        onComplete={onComplete}
        length={8}
        disabled={false}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12 3a456789');
    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345678');

    expect(onChange).toHaveBeenLastCalledWith('12345678');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('12345678');
  });

  it('renders eight display boxes from the controlled value', () => {
    render(
      <OneTimePasswordInput
        value="123"
        onChange={jest.fn()}
        onComplete={jest.fn()}
        length={8}
        disabled={false}
      />,
    );

    expect(screen.getByText('1', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
    for (let index = 0; index < 8; index += 1) {
      expect(
        screen.getByTestId(`one-time-password-cell-${index}`, { includeHiddenElements: true }),
      ).toBeTruthy();
    }
  });

  it('switches completion and display boxes to six digits for sign-up codes', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();

    render(
      <OneTimePasswordInput
        value=""
        onChange={onChange}
        onComplete={onComplete}
        length={6}
        disabled={false}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345678');

    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
    for (let index = 0; index < 6; index += 1) {
      expect(
        screen.getByTestId(`one-time-password-cell-${index}`, { includeHiddenElements: true }),
      ).toBeTruthy();
    }
    expect(screen.queryByTestId('one-time-password-cell-6', { includeHiddenElements: true })).toBeNull();
  });

  it('highlights the focused input cell', () => {
    render(
      <OneTimePasswordInput
        value="12"
        onChange={jest.fn()}
        onComplete={jest.fn()}
        length={6}
        disabled={false}
      />,
    );

    fireEvent(screen.getByTestId('one-time-password-input'), 'focus');

    const focusedCellStyle = StyleSheet.flatten(
      screen.getByTestId('one-time-password-cell-2', { includeHiddenElements: true }).props.style,
    );
    const previousCellStyle = StyleSheet.flatten(
      screen.getByTestId('one-time-password-cell-1', { includeHiddenElements: true }).props.style,
    );

    expect(focusedCellStyle.borderWidth).toBeGreaterThan(previousCellStyle.borderWidth);
  });

  it('keeps a nonzero native input target over the display boxes', () => {
    render(
      <OneTimePasswordInput
        value=""
        onChange={jest.fn()}
        onComplete={jest.fn()}
        length={8}
        disabled={false}
      />,
    );

    const input = screen.getByTestId('one-time-password-input');
    const style = StyleSheet.flatten(input.props.style);

    expect(input.props.editable).toBe(true);
    expect(style.height).toBe(components.oneTimePassword.cellHeight);
    expect(style.zIndex).toBeGreaterThan(0);
    expect(style.opacity).not.toBe(0);
  });
});
