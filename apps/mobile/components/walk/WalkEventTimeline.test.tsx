import { render, screen, fireEvent } from '@testing-library/react-native';
import { WalkEventTimeline } from './WalkEventTimeline';
import type { WalkEvent } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const peeEvent: WalkEvent = {
  id: 'event-1',
  walkId: 'walk-123',
  dogId: 'dog-1',
  eventType: 'pee',
  occurredAt: '2026-04-12T10:12:00Z',
  lat: 35.6812,
  lng: 139.7671,
  photoUrl: null,
};

const pooEvent: WalkEvent = {
  id: 'event-2',
  walkId: 'walk-123',
  dogId: 'dog-1',
  eventType: 'poo',
  occurredAt: '2026-04-12T10:18:00Z',
  lat: 35.6812,
  lng: 139.7671,
  photoUrl: null,
};

const photoEvent: WalkEvent = {
  id: 'event-3',
  walkId: 'walk-123',
  dogId: null,
  eventType: 'photo',
  occurredAt: '2026-04-12T10:25:00Z',
  lat: null,
  lng: null,
  photoUrl: 'https://cdn.example.com/walks/walk-123/photo.jpg',
};

describe('WalkEventTimeline', () => {
  it('renders nothing when events array is empty', () => {
    render(<WalkEventTimeline events={[]} />);
    expect(screen.queryByText('Pee')).toBeNull();
    expect(screen.queryByText('Poo')).toBeNull();
    expect(screen.queryByText('Photo')).toBeNull();
  });

  it('renders pee event with emoji and time', () => {
    render(<WalkEventTimeline events={[peeEvent]} />);
    expect(screen.getByText('🚽')).toBeTruthy();
    expect(screen.getByText('Pee')).toBeTruthy();
  });

  it('renders poo event with emoji', () => {
    render(<WalkEventTimeline events={[pooEvent]} />);
    expect(screen.getByText('💩')).toBeTruthy();
    expect(screen.getByText('Poo')).toBeTruthy();
  });

  it('renders photo event with camera emoji and thumbnail', () => {
    render(<WalkEventTimeline events={[photoEvent]} />);
    expect(screen.getByText('📷')).toBeTruthy();
    expect(screen.getByText('Photo')).toBeTruthy();
    expect(screen.getByAccessibilityHint('Tap to view full screen')).toBeTruthy();
  });

  it('renders all three event types when provided', () => {
    render(<WalkEventTimeline events={[peeEvent, pooEvent, photoEvent]} />);
    expect(screen.getByText('🚽')).toBeTruthy();
    expect(screen.getByText('💩')).toBeTruthy();
    expect(screen.getByText('📷')).toBeTruthy();
  });

  it('shows full screen modal when photo thumbnail is tapped', () => {
    render(<WalkEventTimeline events={[photoEvent]} />);
    const thumbnail = screen.getByAccessibilityHint('Tap to view full screen');
    fireEvent.press(thumbnail);
    expect(screen.getByLabelText('Close photo')).toBeTruthy();
  });
});
