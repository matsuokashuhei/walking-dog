import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl } from './SegmentedControl';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const options = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'All', value: 'ALL' },
];

describe('SegmentedControl', () => {
  it('renders every option label', () => {
    render(<SegmentedControl options={options} selected="WEEK" onChange={jest.fn()} />);
    for (const opt of options) {
      expect(screen.getByText(opt.label)).toBeTruthy();
    }
  });

  it('marks only the selected option with accessibilityState.selected', () => {
    render(<SegmentedControl options={options} selected="MONTH" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Month' }).props.accessibilityState?.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Week' }).props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it('calls onChange with option value when pressed', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} selected="WEEK" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('ALL');
  });

  it('still fires onChange when the currently-selected option is pressed', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} selected="WEEK" onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: 'Week' }));
    expect(onChange).toHaveBeenCalledWith('WEEK');
  });
});
