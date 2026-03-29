import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DogForm } from './DogForm';

describe('DogForm', () => {
  it('renders name field', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="Register" />);
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('disables submit when name is empty', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="Register" />);
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  it('calls onSubmit with form values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<DogForm onSubmit={onSubmit} submitLabel="Register" />);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Hana');
    fireEvent.changeText(screen.getByLabelText('Breed'), 'Poodle');
    fireEvent.press(screen.getByRole('button', { name: 'Register' }));

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
        submitLabel="Update"
        initialValues={{ name: 'Kuro', breed: 'Labrador' }}
      />
    );
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
  });
});
