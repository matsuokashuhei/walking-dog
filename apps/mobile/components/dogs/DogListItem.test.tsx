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

  it('shows shared badge when role is member', () => {
    const sharedDog: Dog = { ...mockDog, role: 'member' };
    render(<DogListItem dog={sharedDog} onPress={jest.fn()} />);
    expect(screen.getByText('Shared')).toBeTruthy();
  });

  it('does not show shared badge when role is owner', () => {
    const ownedDog: Dog = { ...mockDog, role: 'owner' };
    render(<DogListItem dog={ownedDog} onPress={jest.fn()} />);
    expect(screen.queryByText('Shared')).toBeNull();
  });

  it('does not show shared badge when role is undefined', () => {
    render(<DogListItem dog={mockDog} onPress={jest.fn()} />);
    expect(screen.queryByText('Shared')).toBeNull();
  });

  it('renders without breed when breed is null', () => {
    const dogNullBreed: Dog = { ...mockDog, breed: null };
    render(<DogListItem dog={dogNullBreed} onPress={jest.fn()} />);
    expect(screen.getByText('Pochi')).toBeTruthy();
    expect(screen.queryByText('Shiba Inu')).toBeNull();
  });
});
