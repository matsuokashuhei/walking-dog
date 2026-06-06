import { render } from '@testing-library/react-native';
import WalkRecordingScreen from '../../app/walk-recording';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUseActiveWalkSnapshotSync = jest.fn();
let mockParams: { action?: string; walkId?: string } = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/hooks/use-active-walk-snapshot-sync', () => ({
  useActiveWalkSnapshotSync: (...args: unknown[]) => mockUseActiveWalkSnapshotSync(...args),
}));

describe('WalkRecordingScreen bridge route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { walkId: 'walk-1' };
  });

  it('redirects active walk deep links back to the Walk tab without rendering recording UI', () => {
    const { toJSON } = render(<WalkRecordingScreen />);

    expect(mockUseActiveWalkSnapshotSync).toHaveBeenCalledWith('walk-1');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)/walk',
      params: { walkId: 'walk-1' },
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(toJSON()).toBeNull();
  });

  it('preserves a camera action while bridging back to the Walk tab', () => {
    mockParams = { action: 'camera', walkId: 'walk-1' };

    render(<WalkRecordingScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)/walk',
      params: { action: 'camera', walkId: 'walk-1' },
    });
  });
});
