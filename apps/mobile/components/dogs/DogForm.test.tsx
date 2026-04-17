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

  it('disables submit when gender is empty', () => {
    render(
      <DogForm
        onSubmit={jest.fn()}
        submitLabel="Register"
        initialValues={{ name: 'Hana' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  it('enables submit when both name and gender are filled', () => {
    render(
      <DogForm
        onSubmit={jest.fn()}
        submitLabel="Register"
        initialValues={{ name: 'Hana', gender: 'male' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Register' })).not.toBeDisabled();
  });

  it('calls onSubmit with form values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<DogForm onSubmit={onSubmit} submitLabel="Register" />);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Hana');
    fireEvent.changeText(screen.getByLabelText('Breed'), 'Poodle');
    fireEvent.changeText(screen.getByLabelText('Gender'), 'male');
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
