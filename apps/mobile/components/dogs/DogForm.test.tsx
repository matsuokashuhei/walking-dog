import { render, screen, fireEvent } from '@testing-library/react-native';
import { DogForm, isDogFormValid, type DogFormValues } from './DogForm';

describe('DogForm', () => {
  function setup(initial: DogFormValues = { name: '', breed: '', gender: '' }) {
    const onChange = jest.fn();
    const utils = render(<DogForm values={initial} onChange={onChange} />);
    return { onChange, ...utils };
  }

  it('renders name/breed/gender fields', () => {
    setup();
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Breed')).toBeTruthy();
    expect(screen.getByLabelText('Gender')).toBeTruthy();
  });

  it('calls onChange with patched values when name changes', () => {
    const { onChange } = setup({ name: '', breed: 'Poodle', gender: 'male' });
    fireEvent.changeText(screen.getByLabelText('Name'), 'Hana');
    expect(onChange).toHaveBeenCalledWith({ name: 'Hana', breed: 'Poodle', gender: 'male' });
  });

  it('calls onChange with patched values when breed changes', () => {
    const { onChange } = setup({ name: 'Hana', breed: '', gender: 'male' });
    fireEvent.changeText(screen.getByLabelText('Breed'), 'Poodle');
    expect(onChange).toHaveBeenCalledWith({ name: 'Hana', breed: 'Poodle', gender: 'male' });
  });

  it('calls onChange with patched values when gender changes', () => {
    const { onChange } = setup({ name: 'Hana', breed: 'Poodle', gender: '' });
    fireEvent.changeText(screen.getByLabelText('Gender'), 'male');
    expect(onChange).toHaveBeenCalledWith({ name: 'Hana', breed: 'Poodle', gender: 'male' });
  });

  it('pre-fills initial values', () => {
    setup({ name: 'Kuro', breed: 'Labrador', gender: 'male' });
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
    expect(screen.getByDisplayValue('male')).toBeTruthy();
  });
});

describe('isDogFormValid', () => {
  it('returns false when name is empty', () => {
    expect(isDogFormValid({ name: '', breed: '', gender: 'male' })).toBe(false);
  });

  it('returns false when name is whitespace only', () => {
    expect(isDogFormValid({ name: '   ', breed: '', gender: 'male' })).toBe(false);
  });

  it('returns false when gender is empty', () => {
    expect(isDogFormValid({ name: 'Hana', breed: '', gender: '' })).toBe(false);
  });

  it('returns false when gender is whitespace only', () => {
    expect(isDogFormValid({ name: 'Hana', breed: '', gender: '  ' })).toBe(false);
  });

  it('returns true when both name and gender are filled', () => {
    expect(isDogFormValid({ name: 'Hana', breed: '', gender: 'male' })).toBe(true);
  });
});
