import { fireEvent, render, screen } from '@testing-library/react-native';
import { OneTimePasswordInput } from './OneTimePasswordInput';

describe('OneTimePasswordInput', () => {
  it('normalizes pasted text and completes once when the code reaches the requested length', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    render(
      <OneTimePasswordInput
        length={6}
        value=""
        onChange={onChange}
        onComplete={onComplete}
        label="One-time password"
      />,
    );

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12a3 456');

    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not fire onComplete repeatedly for the same completed code', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    const { rerender } = render(
      <OneTimePasswordInput
        length={6}
        value=""
        onChange={onChange}
        onComplete={onComplete}
        label="One-time password"
      />,
    );

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');
    rerender(
      <OneTimePasswordInput
        length={6}
        value="123456"
        onChange={onChange}
        onComplete={onComplete}
        label="One-time password"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('allows a new completion after the code becomes incomplete', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    const { rerender } = render(
      <OneTimePasswordInput
        length={6}
        value="123456"
        onChange={onChange}
        onComplete={onComplete}
        label="One-time password"
      />,
    );

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12345');
    rerender(
      <OneTimePasswordInput
        length={6}
        value="12345"
        onChange={onChange}
        onComplete={onComplete}
        label="One-time password"
      />,
    );
    fireEvent.changeText(screen.getByLabelText('One-time password'), '654321');

    expect(onComplete).toHaveBeenCalledWith('654321');
  });

  it('renders one visual slot for each code character', () => {
    render(
      <OneTimePasswordInput
        length={6}
        value="123"
        onChange={jest.fn()}
        onComplete={jest.fn()}
        label="One-time password"
      />,
    );

    expect(screen.getAllByTestId('one-time-password-slot')).toHaveLength(6);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
