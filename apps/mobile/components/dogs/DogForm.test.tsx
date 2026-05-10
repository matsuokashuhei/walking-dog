import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  DogForm,
  birthdayValuesToInput,
  dogBirthdayToFormValues,
  isDogFormValid,
  type DogFormValues,
} from './DogForm';

function makeValues(overrides: Partial<DogFormValues> = {}): DogFormValues {
  return {
    name: '',
    breed: '',
    gender: '',
    birthdayYear: '',
    birthdayMonth: '',
    birthdayDay: '',
    ...overrides,
  };
}

describe('DogForm', () => {
  function setup(initial: DogFormValues = makeValues()) {
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

  it('renders birthday year/month/day fields', () => {
    setup();
    expect(screen.getByLabelText('Year')).toBeTruthy();
    expect(screen.getByLabelText('Month')).toBeTruthy();
    expect(screen.getByLabelText('Day')).toBeTruthy();
  });

  it('calls onChange with patched values when name changes', () => {
    const { onChange } = setup(makeValues({ breed: 'Poodle', gender: 'male' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Hana');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'male' }));
  });

  it('calls onChange with patched values when breed changes', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', gender: 'male' }));
    fireEvent.changeText(screen.getByLabelText('Breed'), 'Poodle');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'male' }));
  });

  it('calls onChange with patched values when gender changes', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', breed: 'Poodle' }));
    fireEvent.changeText(screen.getByLabelText('Gender'), 'male');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'male' }));
  });

  it('keeps only digits when birthday year changes', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', gender: 'male' }));
    fireEvent.changeText(screen.getByLabelText('Year'), '20a2');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', gender: 'male', birthdayYear: '202' }));
  });

  it('pre-fills initial values', () => {
    setup(makeValues({ name: 'Kuro', breed: 'Labrador', gender: 'male', birthdayYear: '2021', birthdayMonth: '6' }));
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
    expect(screen.getByDisplayValue('male')).toBeTruthy();
    expect(screen.getByDisplayValue('2021')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
  });
});

describe('isDogFormValid', () => {
  it('returns false when name is empty', () => {
    expect(isDogFormValid(makeValues({ gender: 'male' }))).toBe(false);
  });

  it('returns false when name is whitespace only', () => {
    expect(isDogFormValid(makeValues({ name: '   ', gender: 'male' }))).toBe(false);
  });

  it('returns false when gender is empty', () => {
    expect(isDogFormValid(makeValues({ name: 'Hana' }))).toBe(false);
  });

  it('returns false when gender is whitespace only', () => {
    expect(isDogFormValid(makeValues({ name: 'Hana', gender: '  ' }))).toBe(false);
  });

  it('returns true when both name and gender are filled (birthday optional)', () => {
    expect(isDogFormValid(makeValues({ name: 'Hana', gender: 'male' }))).toBe(true);
  });
});

describe('birthdayValuesToInput', () => {
  it('returns null when all birthday fields are empty', () => {
    expect(birthdayValuesToInput(makeValues({ name: 'Hana', gender: 'male' }))).toBeNull();
  });

  it('returns year only when only year is filled', () => {
    expect(birthdayValuesToInput(makeValues({ birthdayYear: '2021' }))).toEqual({ year: 2021 });
  });

  it('returns year and month when both are filled', () => {
    expect(birthdayValuesToInput(makeValues({ birthdayYear: '2021', birthdayMonth: '6' }))).toEqual({
      year: 2021,
      month: 6,
    });
  });

  it('returns full birthday when year, month and day are filled', () => {
    expect(
      birthdayValuesToInput(makeValues({ birthdayYear: '2021', birthdayMonth: '6', birthdayDay: '15' })),
    ).toEqual({ year: 2021, month: 6, day: 15 });
  });

  it('drops out-of-range month and day', () => {
    expect(
      birthdayValuesToInput(makeValues({ birthdayYear: '2021', birthdayMonth: '13', birthdayDay: '40' })),
    ).toEqual({ year: 2021 });
  });

  it('ignores non-positive / non-integer values', () => {
    expect(birthdayValuesToInput(makeValues({ birthdayYear: '0', birthdayMonth: '00', birthdayDay: '' }))).toBeNull();
  });
});

describe('dogBirthdayToFormValues', () => {
  it('maps a full birthday to strings', () => {
    expect(dogBirthdayToFormValues({ year: 2021, month: 6, day: 15 })).toEqual({
      birthdayYear: '2021',
      birthdayMonth: '6',
      birthdayDay: '15',
    });
  });

  it('maps a year-only birthday, leaving the rest empty', () => {
    expect(dogBirthdayToFormValues({ year: 2021, month: null, day: null })).toEqual({
      birthdayYear: '2021',
      birthdayMonth: '',
      birthdayDay: '',
    });
  });

  it('maps null/undefined to all-empty strings', () => {
    expect(dogBirthdayToFormValues(null)).toEqual({ birthdayYear: '', birthdayMonth: '', birthdayDay: '' });
    expect(dogBirthdayToFormValues(undefined)).toEqual({ birthdayYear: '', birthdayMonth: '', birthdayDay: '' });
  });
});
