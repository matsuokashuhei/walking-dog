import { EVENT_EMOJIS } from './event-emojis';

describe('EVENT_EMOJIS', () => {
  it('maps pee to toilet emoji', () => {
    expect(EVENT_EMOJIS.pee).toBe('🚽');
  });

  it('maps poo to poop emoji', () => {
    expect(EVENT_EMOJIS.poo).toBe('💩');
  });

  it('maps photo to camera emoji', () => {
    expect(EVENT_EMOJIS.photo).toBe('📷');
  });
});
