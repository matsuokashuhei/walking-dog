import { ActionSheetIOS } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  DogForm,
  birthdayValuesToInput,
  dogBirthdayToFormValues,
  isDogFormValid,
  type DogFormValues,
} from './DogForm';
import { components, spacing } from '@/theme/tokens';

jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

jest.mock('@expo/ui/swift-ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual('react-native');
  return {
    Host: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    Slider: ({
      onValueChange,
      ...props
    }: {
      onValueChange?: (value: number) => void;
    }) => (
      <View
        {...props}
        accessibilityRole="adjustable"
        onValueChange={onValueChange}
      />
    ),
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  clipped: (clipped = true) => ({ $type: 'clipped', clipped }),
  frame: (params: Record<string, unknown>) => ({ $type: 'frame', ...params }),
}));

function makeValues(overrides: Partial<DogFormValues> = {}): DogFormValues {
  return {
    name: '',
    breed: '',
    gender: '',
    birthdayYear: '',
    birthdayMonth: '',
    birthdayDay: '',
    goalMinutes: 30,
    goalCycleDays: 1,
    ...overrides,
  };
}

describe('DogForm', () => {
  beforeEach(() => {
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(
      (_config, cb) => cb(1),
    );
  });

  function setup(initial: DogFormValues = makeValues()) {
    const onChange = jest.fn();
    const utils = render(<DogForm values={initial} onChange={onChange} />);
    return { onChange, ...utils };
  }

  it('renders name/breed fields and the selected gender value', () => {
    setup();
    expect(screen.getByPlaceholderText('Name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Breed')).toBeTruthy();
    expect(screen.getByText('Gender')).toBeTruthy();
    expect(screen.getByText('Select gender')).toBeTruthy();
    expect(screen.queryByTestId('dog-gender-segmented-control')).toBeNull();
  });

  it('sizes the native profile field section so all rows are initially visible', () => {
    setup();
    expect(screen.getByTestId('dog-profile-fields-host').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: expect.any(Number) }),
        expect.objectContaining({
          height: components.textInput.height * 2 + components.row.minHeight * 2 + spacing.step60 * 2,
        }),
      ]),
    );
  });

  it('renders the goal section with the default daily time goal', () => {
    setup();
    expect(screen.getByText('GOAL')).toBeTruthy();
    expect(screen.getByText('Cycle')).toBeTruthy();
    expect(screen.getByText('DAILY')).toBeTruthy();
    expect(screen.getByText('WEEKLY')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'DAILY' }).props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'WEEKLY' }).props.accessibilityState?.selected).toBe(
      false,
    );
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('0 min')).toBeTruthy();
    expect(screen.getByText('120 min')).toBeTruthy();
  });

  it('renders a weekly goal with weekly limits', () => {
    setup(makeValues({ goalMinutes: 210, goalCycleDays: 7 }));
    expect(screen.getByRole('button', { name: 'WEEKLY' }).props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByText('210 min')).toBeTruthy();
    expect(screen.getByText('0 min')).toBeTruthy();
    expect(screen.getByText('840 min')).toBeTruthy();
  });

  it('converts the goal amount when switching between daily and weekly cycles', () => {
    const { onChange, rerender } = setup(makeValues({ goalMinutes: 30, goalCycleDays: 1 }));

    fireEvent.press(screen.getByRole('button', { name: 'WEEKLY' }));

    expect(onChange).toHaveBeenCalledWith(makeValues({ goalMinutes: 210, goalCycleDays: 7 }));

    rerender(
      <DogForm
        values={makeValues({ goalMinutes: 210, goalCycleDays: 7 })}
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'DAILY' }));

    expect(onChange).toHaveBeenLastCalledWith(makeValues({ goalMinutes: 30, goalCycleDays: 1 }));
  });

  it('applies native slider value changes for each cycle', () => {
    const { onChange, rerender } = setup(makeValues({ goalMinutes: 30, goalCycleDays: 1 }));
    const slider = screen.getByTestId('dog-goal-slider');

    fireEvent(slider, 'valueChange', 35);

    expect(onChange).toHaveBeenCalledWith(makeValues({ goalMinutes: 35, goalCycleDays: 1 }));

    rerender(
      <DogForm
        values={makeValues({ goalMinutes: 70, goalCycleDays: 7 })}
        onChange={onChange}
      />,
    );

    fireEvent(screen.getByTestId('dog-goal-slider'), 'valueChange', 65);

    expect(onChange).toHaveBeenLastCalledWith(makeValues({ goalMinutes: 65, goalCycleDays: 7 }));
  });

  it('updates the goal from the native slider value change', () => {
    const { onChange } = setup(makeValues({ goalMinutes: 30, goalCycleDays: 1 }));
    const slider = screen.getByTestId('dog-goal-slider');

    expect(slider.props.min).toBe(0);
    expect(slider.props.max).toBe(120);
    expect(slider.props.step).toBe(5);
    fireEvent(slider, 'valueChange', 120);

    expect(onChange).toHaveBeenCalledWith(makeValues({ goalMinutes: 120, goalCycleDays: 1 }));
  });

  it('keeps the native goal slider host tight to the slider track', () => {
    setup();
    const slider = screen.getByTestId('dog-goal-slider');

    expect(screen.getByTestId('dog-goal-slider-host').props.style).toEqual(
      expect.objectContaining({
        height: spacing.xl,
        width: '100%',
      }),
    );
    expect(slider.props.modifiers).toEqual([
      { $type: 'frame', height: spacing.xl },
      { $type: 'clipped', clipped: true },
    ]);
  });

  it('renders birthday in the profile group without an empty-state value', () => {
    setup();
    expect(screen.getByText('Birthday')).toBeTruthy();
    expect(screen.queryByText('Add birthday')).toBeNull();
  });

  it('renders a formatted birthday when all birthday values are set', () => {
    setup(makeValues({ birthdayYear: '2021', birthdayMonth: '6', birthdayDay: '15' }));
    expect(screen.getByText('Jun 15, 2021')).toBeTruthy();
  });

  it('calls onChange with patched values when name changes', () => {
    const { onChange } = setup(makeValues({ breed: 'Poodle', gender: 'male' }));
    fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Hana');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'male' }));
  });

  it('calls onChange with patched values when breed changes', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', gender: 'male' }));
    fireEvent.changeText(screen.getByPlaceholderText('Breed'), 'Poodle');
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'male' }));
  });

  it('opens the gender ActionSheet and calls onChange with patched values', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', breed: 'Poodle' }));
    fireEvent.press(screen.getByText('Gender'));
    expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalledWith(
      {
        options: ['Male', 'Female', 'Other', 'Cancel'],
        cancelButtonIndex: 3,
      },
      expect.any(Function),
    );
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', breed: 'Poodle', gender: 'FEMALE' }));
  });

  it('opens the birthday picker modal from the birthday row', () => {
    setup();
    fireEvent.press(screen.getByText('Birthday'));
    expect(screen.getByText('Year')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByTestId('birthday-year-unknown')).toBeTruthy();
    expect(screen.getAllByText('---')).toHaveLength(3);
    expect(screen.queryByText('Unknown')).toBeNull();
  });

  it('stages birthday changes until Save is pressed', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', gender: 'male' }));
    fireEvent.press(screen.getByText('Birthday'));
    fireEvent.press(screen.getByTestId('birthday-year-2021'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', gender: 'male', birthdayYear: '2021' }));
  });

  it('discards staged birthday changes when Cancel is pressed', () => {
    const { onChange } = setup(makeValues({ name: 'Hana', gender: 'male' }));
    fireEvent.press(screen.getByText('Birthday'));
    fireEvent.press(screen.getByTestId('birthday-year-2021'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears month and day when selecting Unknown for year before Save', () => {
    const { onChange } = setup(
      makeValues({ name: 'Hana', gender: 'male', birthdayYear: '2021', birthdayMonth: '6', birthdayDay: '15' }),
    );
    fireEvent.press(screen.getByText('Birthday'));
    fireEvent.press(screen.getByTestId('birthday-year-unknown'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', gender: 'male' }));
  });

  it('clears day when selecting Unknown for month before Save', () => {
    const { onChange } = setup(
      makeValues({ name: 'Hana', gender: 'male', birthdayYear: '2021', birthdayMonth: '6', birthdayDay: '15' }),
    );
    fireEvent.press(screen.getByText('Birthday'));
    fireEvent.press(screen.getByTestId('birthday-month-unknown'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onChange).toHaveBeenCalledWith(makeValues({ name: 'Hana', gender: 'male', birthdayYear: '2021' }));
  });

  it('requires year before month and month before day can be selected', () => {
    setup();
    fireEvent.press(screen.getByText('Birthday'));
    expect(screen.getByTestId('birthday-month-1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('birthday-day-1').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('birthday-year-2021'));
    expect(screen.getByTestId('birthday-month-1').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('birthday-day-1').props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('birthday-month-6'));
    expect(screen.getByTestId('birthday-day-1').props.accessibilityState.disabled).toBe(false);
  });

  it('pre-fills initial values', () => {
    setup(makeValues({ name: 'Kuro', breed: 'Labrador', gender: 'male', birthdayYear: '2021', birthdayMonth: '6' }));
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
    expect(screen.getByText('Male')).toBeTruthy();
    expect(screen.getByText('Jun 2021')).toBeTruthy();
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

  it('ignores month and day values without their parent values', () => {
    expect(birthdayValuesToInput(makeValues({ birthdayMonth: '6', birthdayDay: '15' }))).toBeNull();
    expect(birthdayValuesToInput(makeValues({ birthdayYear: '2021', birthdayDay: '15' }))).toEqual({ year: 2021 });
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
