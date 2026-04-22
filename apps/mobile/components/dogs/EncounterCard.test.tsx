import { render, screen } from '@testing-library/react-native';
import { EncounterCard } from './EncounterCard';
import type { Encounter } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const encounter: Encounter = {
  id: 'encounter-1',
  durationSec: 1200,
  metAt: '2026-04-20T08:30:00Z',
  dog1: {
    id: 'dog-1',
    name: 'Coco',
    breed: 'Toy Poodle',
    photoUrl: null,
  },
  dog2: {
    id: 'dog-2',
    name: 'Lucky',
    breed: 'Shiba Inu',
    photoUrl: null,
  },
};

describe('EncounterCard', () => {
  it('shows the other dog when my dog is dog1', () => {
    render(<EncounterCard encounter={encounter} myDogId="dog-1" />);

    expect(screen.getByText('Lucky')).toBeTruthy();
    expect(screen.queryByText('Coco')).toBeNull();
    expect(screen.getByText('20:00')).toBeTruthy();
    expect(screen.getByText('duration')).toBeTruthy();
  });

  it('shows the other dog when my dog is dog2', () => {
    render(<EncounterCard encounter={encounter} myDogId="dog-2" />);

    expect(screen.getByText('Coco')).toBeTruthy();
    expect(screen.queryByText('Lucky')).toBeNull();
  });
});
