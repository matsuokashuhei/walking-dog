import { render, screen } from '@testing-library/react-native';
import { WalkIdentityHeader } from './WalkIdentityHeader';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

describe('WalkIdentityHeader', () => {
  it('renders the provided title, subtitle, and LIVE tag', () => {
    render(
      <WalkIdentityHeader
        dogs={[coco]}
        title="Coco"
        subtitle="Morning walk"
      />,
    );

    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.getByText('Morning walk')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  it('supports multiple dogs while keeping the header text visible', () => {
    render(
      <WalkIdentityHeader
        dogs={[coco, momo]}
        title="Coco + Momo"
        subtitle="Group walk · together"
      />,
    );

    expect(screen.getByText('Coco + Momo')).toBeTruthy();
    expect(screen.getByText('Group walk · together')).toBeTruthy();
  });
});
