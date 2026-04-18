import { fireEvent, render, screen } from '@testing-library/react-native';
import { ConfirmDialog } from './ConfirmDialog';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const defaultProps = {
  title: 'Delete dog',
  message: 'This cannot be undone.',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConfirmDialog', () => {
  beforeEach(() => {
    defaultProps.onConfirm = jest.fn();
    defaultProps.onCancel = jest.fn();
  });

  it('renders title and message when visible', () => {
    render(<ConfirmDialog visible {...defaultProps} />);
    expect(screen.getByText('Delete dog')).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
  });

  it('hides content when visible is false', () => {
    render(<ConfirmDialog visible={false} {...defaultProps} />);
    expect(screen.queryByText('Delete dog')).toBeNull();
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    render(<ConfirmDialog visible {...defaultProps} />);
    fireEvent.press(screen.getByRole('button', { name: '確認' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is pressed', () => {
    render(<ConfirmDialog visible {...defaultProps} />);
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('uses custom confirm and cancel labels when provided', () => {
    render(
      <ConfirmDialog
        visible
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy();
  });
});
