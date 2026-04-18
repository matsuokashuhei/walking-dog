import { fireEvent, render, screen } from '@testing-library/react-native';
import { DogPickerCard } from './DogPickerCard';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: 'Toy Poodle',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: 'Shiba Inu',
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

describe('DogPickerCard', () => {
  it('renders each dog name and breed', () => {
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={[]}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Toy Poodle')).toBeTruthy();
    expect(screen.getByText('Momo')).toBeTruthy();
    expect(screen.getByText('Shiba Inu')).toBeTruthy();
  });

  it('marks selected rows with accessibilityState.checked = true', () => {
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={['dog-1']}
        onToggle={jest.fn()}
      />,
    );
    const cocoRow = screen.getByRole('checkbox', { name: 'Coco' });
    const momoRow = screen.getByRole('checkbox', { name: 'Momo' });
    expect(cocoRow.props.accessibilityState.checked).toBe(true);
    expect(momoRow.props.accessibilityState.checked).toBe(false);
  });

  it('invokes onToggle with the dog id when a row is pressed', () => {
    const onToggle = jest.fn();
    render(
      <DogPickerCard
        dogs={[coco, momo]}
        selectedIds={[]}
        onToggle={onToggle}
      />,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Momo' }));
    expect(onToggle).toHaveBeenCalledWith('dog-2');
  });

  it('omits breed text when breed is null', () => {
    const mystery: Dog = { ...coco, id: 'dog-3', name: 'Mystery', breed: null };
    render(
      <DogPickerCard
        dogs={[mystery]}
        selectedIds={[]}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('Mystery')).toBeTruthy();
    expect(screen.queryByText('Toy Poodle')).toBeNull();
  });
});
