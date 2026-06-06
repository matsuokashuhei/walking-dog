import {
  buildUserProfileViewModel,
  type UserProfileData,
} from './use-user-profile-view-model';

const t = (key: string, values?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    'settings.profile.title': 'Profile',
    'settings.profile.edit': 'Edit',
    'settings.profile.unknownName': 'Unknown user',
    'settings.profile.walkingSince': `Walking since ${values?.date}`,
    'settings.profile.stats.walks': 'Walks',
    'settings.profile.stats.distance': 'km',
    'settings.profile.stats.totalTime': 'Total time',
    'settings.profile.stats.dogs': 'Dogs',
    'settings.profile.week.title': 'This week',
    'settings.profile.week.total': `${values?.distance} total`,
  };
  return map[key] ?? key;
};

const profileData: UserProfileData = {
  user: {
    id: 'user-1',
    name: 'Mio Tanaka',
    avatar: null,
    avatarUrl: null,
    displayName: 'Mio Tanaka',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    dogs: [
      {
        id: 'dog-1',
        name: 'Coco',
        breed: null,
        gender: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'dog-2',
        name: 'Momo',
        breed: null,
        gender: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
  },
  totalWalks: 263,
  totalDistanceM: 412_800,
  totalDurationSec: 313_200,
  recentWalks: [
    { id: 'walk-mon', startedAt: '2026-05-25T10:00:00+09:00', distanceM: 800 },
    { id: 'walk-tue', startedAt: '2026-05-26T10:00:00+09:00', distanceM: 1_200 },
    { id: 'walk-wed', startedAt: '2026-05-27T10:00:00+09:00', distanceM: 2_100 },
    { id: 'walk-fri', startedAt: '2026-05-29T10:00:00+09:00', distanceM: 1_600 },
    { id: 'walk-sat', startedAt: '2026-05-30T10:00:00+09:00', distanceM: 2_400 },
  ],
};

describe('buildUserProfileViewModel', () => {
  it('builds user identity, lifetime stats, and the current-week chart from real data', () => {
    const vm = buildUserProfileViewModel(
      profileData,
      t,
      new Date('2026-05-30T12:00:00+09:00'),
      'en-US',
    );

    expect(vm.displayName).toBe('Mio Tanaka');
    expect(vm.initial).toBe('M');
    expect(vm.walkingSince).toBe('Walking since March 2024');
    expect(vm.metrics).toEqual([
      { key: 'walks', value: '263', label: 'Walks' },
      { key: 'distance', value: '412.8', label: 'km' },
      { key: 'totalTime', value: '87h 0m', label: 'Total time' },
      { key: 'dogs', value: '2', label: 'Dogs' },
    ]);
    expect(vm.week.title).toBe('This week');
    expect(vm.week.totalLabel).toBe('8.1 km total');
    expect(vm.week.days.map((day) => day.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    expect(vm.week.days.map((day) => day.distanceKm)).toEqual([
      0.8,
      1.2,
      2.1,
      0,
      1.6,
      2.4,
      0,
    ]);
    expect(vm.week.days[5]).toMatchObject({
      isToday: true,
      valueLabel: '2.4',
      progress: 1,
    });
  });

  it('falls back to an unknown user label when the user has no name', () => {
    const vm = buildUserProfileViewModel(
      {
        ...profileData,
        user: { ...profileData.user, name: null, displayName: null },
      },
      t,
      new Date('2026-05-30T12:00:00+09:00'),
      'en-US',
    );

    expect(vm.displayName).toBe('Unknown user');
    expect(vm.initial).toBe('?');
  });
});
