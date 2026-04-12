import { fireEvent, render, screen } from '@testing-library/react-native';
import { DogSelectorSheet } from './DogSelectorSheet';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: {
      dogs: [
        { id: 'dog-1', name: 'Pochi', breed: 'Shiba', photoUrl: null, createdAt: '2026-01-01' },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: unknown) => unknown) =>
    selector({
      selectedDogIds: ['dog-1'],
      selectDog: jest.fn(),
    }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('DogSelectorSheet', () => {
  it('does not render content when visible is false', () => {
    render(
      <DogSelectorSheet
        visible={false}
        onClose={jest.fn()}
        onStart={jest.fn()}
        isStarting={false}
      />,
    );
    expect(screen.queryByText("Let's go for a walk!")).toBeNull();
  });

  it('renders DogSelector content when visible', () => {
    render(
      <DogSelectorSheet
        visible={true}
        onClose={jest.fn()}
        onStart={jest.fn()}
        isStarting={false}
      />,
    );
    expect(screen.getByText("Let's go for a walk!")).toBeTruthy();
    expect(screen.getByText('Pochi')).toBeTruthy();
  });

  it('invokes onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    render(
      <DogSelectorSheet
        visible={true}
        onClose={onClose}
        onStart={jest.fn()}
        isStarting={false}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onStart when Start Walk is pressed', () => {
    const onStart = jest.fn();
    render(
      <DogSelectorSheet
        visible={true}
        onClose={jest.fn()}
        onStart={onStart}
        isStarting={false}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Start Walk' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
