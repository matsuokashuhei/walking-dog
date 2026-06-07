import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { LinearTransition } from 'react-native-reanimated';
import { WalkRecordingControlsOverlay } from './WalkRecordingControlsOverlay';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

const mockSetMinimized = jest.fn();
const mockStoreState = {
  walkId: 'walk-1',
  isMinimized: false,
  setMinimized: mockSetMinimized,
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({ stop: jest.fn() }),
}));

jest.mock('./WalkControls', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WalkControls: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('./WalkEventActions', () => {
  const { View } = jest.requireActual('react-native');
  return { WalkEventActions: () => <View /> };
});

jest.mock('./WalkMinimizedControls', () => {
  const { View } = jest.requireActual('react-native');
  return { WalkMinimizedControls: () => <View /> };
});

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

type AnimationBuilderMock = {
  duration: jest.Mock;
  springify: jest.Mock;
  damping: jest.Mock;
  stiffness: jest.Mock;
};

describe('WalkRecordingControlsOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.isMinimized = false;
  });

  it('uses a non-spring layout transition so the floating sheet does not bounce', () => {
    const transition = LinearTransition as unknown as AnimationBuilderMock;

    render(<WalkRecordingControlsOverlay dogs={[coco]} />);

    expect(transition.duration).toHaveBeenCalledWith(180);
    expect(transition.springify).not.toHaveBeenCalled();
    expect(transition.damping).not.toHaveBeenCalled();
    expect(transition.stiffness).not.toHaveBeenCalled();
  });
});
