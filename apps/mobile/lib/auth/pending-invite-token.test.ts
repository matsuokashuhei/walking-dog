import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  savePendingInviteToken,
  getPendingInviteToken,
  deletePendingInviteToken,
  PENDING_INVITE_KEY,
} from './pending-invite-token';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('pending-invite-token (native)', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });
  beforeEach(() => jest.clearAllMocks());

  it('savePendingInviteToken calls SecureStore.setItemAsync', async () => {
    await savePendingInviteToken('tok-1');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY, 'tok-1');
  });

  it('getPendingInviteToken calls SecureStore.getItemAsync', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('tok-1');
    expect(await getPendingInviteToken()).toBe('tok-1');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);
  });

  it('getPendingInviteToken returns null when no token stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    expect(await getPendingInviteToken()).toBeNull();
  });

  it('deletePendingInviteToken calls SecureStore.deleteItemAsync', async () => {
    await deletePendingInviteToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(PENDING_INVITE_KEY);
  });
});

describe('pending-invite-token (web)', () => {
  let store: Record<string, string>;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    store = {};
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });
  });
  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
  });
  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });

  it('savePendingInviteToken writes to localStorage', async () => {
    await savePendingInviteToken('web-tok');
    expect(store[PENDING_INVITE_KEY]).toBe('web-tok');
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('getPendingInviteToken reads from localStorage', async () => {
    store[PENDING_INVITE_KEY] = 'web-tok';
    expect(await getPendingInviteToken()).toBe('web-tok');
    expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('getPendingInviteToken returns null when localStorage empty', async () => {
    expect(await getPendingInviteToken()).toBeNull();
  });

  it('deletePendingInviteToken removes from localStorage', async () => {
    store[PENDING_INVITE_KEY] = 'web-tok';
    await deletePendingInviteToken();
    expect(PENDING_INVITE_KEY in store).toBe(false);
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
