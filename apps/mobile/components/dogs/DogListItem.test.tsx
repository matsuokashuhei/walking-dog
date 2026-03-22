import { render, screen, fireEvent } from '@testing-library/react-native';
import { DogListItem } from './DogListItem';
import type { Dog } from '@/types/graphql';

const mockDog: Dog = {
  id: 'dog-1',
  name: 'Pochi',
  breed: 'Shiba Inu',
  gender: 'MALE',
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
};

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('DogListItem', () => {
  it('renders dog name and breed', () => {
    render(<DogListItem dog={mockDog} onPress={jest.fn()} />);
    expect(screen.getByText('Pochi')).toBeTruthy();
    expect(screen.getByText('Shiba Inu')).toBeTruthy();
  });

  it('calls onPress with dog id', () => {
    const onPress = jest.fn();
    render(<DogListItem dog={mockDog} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Pochi' }));
    expect(onPress).toHaveBeenCalledWith('dog-1');
  });
});
