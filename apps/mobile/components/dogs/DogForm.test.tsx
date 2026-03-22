import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DogForm } from './DogForm';

describe('DogForm', () => {
  it('renders name field', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="登録" />);
    expect(screen.getByLabelText('名前')).toBeTruthy();
  });

  it('disables submit when name is empty', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="登録" />);
    expect(screen.getByRole('button', { name: '登録' })).toBeDisabled();
  });

  it('calls onSubmit with form values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<DogForm onSubmit={onSubmit} submitLabel="登録" />);

    fireEvent.changeText(screen.getByLabelText('名前'), 'Hana');
    fireEvent.changeText(screen.getByLabelText('犬種'), 'Poodle');
    fireEvent.press(screen.getByRole('button', { name: '登録' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Hana', breed: 'Poodle' })
      );
    });
  });

  it('pre-fills initial values when editing', () => {
    render(
      <DogForm
        onSubmit={jest.fn()}
        submitLabel="更新"
        initialValues={{ name: 'Kuro', breed: 'Labrador' }}
      />
    );
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
  });
});
