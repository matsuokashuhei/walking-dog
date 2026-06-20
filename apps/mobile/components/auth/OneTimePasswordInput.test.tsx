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
        disabled={false}
      />,
    );

    expect(screen.getByText('1', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByTestId('one-time-password-empty-cell', { includeHiddenElements: true })).toHaveLength(5);
  });

  it('keeps a nonzero native input target over the display boxes', () => {
    render(
      <OneTimePasswordInput
        value=""
        onChange={jest.fn()}
        onComplete={jest.fn()}
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
