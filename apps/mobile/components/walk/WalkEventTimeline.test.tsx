import { render, screen, fireEvent } from '@testing-library/react-native';
import { WalkEventTimeline } from './WalkEventTimeline';
import type { WalkEvent } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
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
    // Labels come from i18n (en locale in tests: Pee/Poo/Photo)
    expect(screen.queryByText('Pee')).toBeNull();
    expect(screen.queryByText('Poo')).toBeNull();
    expect(screen.queryByText('Photo')).toBeNull();
  });

  it('renders pee event with emoji and translated label', () => {
    render(<WalkEventTimeline events={[peeEvent]} />);
    expect(screen.getByText('🚽')).toBeTruthy();
    // i18n en locale returns 'Pee' for walk.event.pee
    expect(screen.getByText('Pee')).toBeTruthy();
  });

  it('renders poo event with emoji and translated label', () => {
    render(<WalkEventTimeline events={[pooEvent]} />);
    expect(screen.getByText('💩')).toBeTruthy();
    // i18n en locale returns 'Poo' for walk.event.poo
    expect(screen.getByText('Poo')).toBeTruthy();
  });

  it('renders photo event with camera emoji and thumbnail', () => {
    render(<WalkEventTimeline events={[photoEvent]} />);
    expect(screen.getByText('📷')).toBeTruthy();
    // i18n en locale returns 'Photo' for walk.event.photo
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

  it('close button top position respects safe area insets', () => {
    render(<WalkEventTimeline events={[photoEvent]} />);
    const thumbnail = screen.getByAccessibilityHint('Tap to view full screen');
    fireEvent.press(thumbnail);
    const closeButton = screen.getByLabelText('Close photo');
    // The close button should have a top style reflecting insets.top (44) + offset (8) = 52
    expect(closeButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ top: 52 }),
      ]),
    );
  });
});
