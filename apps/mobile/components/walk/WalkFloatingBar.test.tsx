import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkFloatingBar } from './WalkFloatingBar';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('./WalkTopChip', () => ({
  WalkTopChip: ({ dogs }: { dogs: Dog[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text>{dogs.map((dog) => dog.name).join(' + ')}</Text>;
  },
}));

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

describe('WalkFloatingBar', () => {
  it('renders the center chip and both action buttons', () => {
    render(
      <WalkFloatingBar
        dogs={[coco, momo]}
        isMinimized={false}
        isHybridMap={false}
        onMinimize={jest.fn()}
        onToggleMapType={jest.fn()}
      />,
    );

    expect(screen.getByText('Coco + Momo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Toggle map style' })).toBeTruthy();
  });

  it('fires both actions', () => {
    const onMinimize = jest.fn();
    const onToggleMapType = jest.fn();

    render(
      <WalkFloatingBar
        dogs={[coco]}
        isMinimized={false}
        isHybridMap={true}
        onMinimize={onMinimize}
        onToggleMapType={onToggleMapType}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Minimize' }));
    fireEvent.press(screen.getByRole('button', { name: 'Toggle map style' }));

    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(onToggleMapType).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Map')).toBeTruthy();
  });

  it('disables the minimize button while already minimized', () => {
    render(
      <WalkFloatingBar
        dogs={[coco]}
        isMinimized={true}
        isHybridMap={false}
        onMinimize={jest.fn()}
        onToggleMapType={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Minimize' }).props.accessibilityState.disabled).toBe(
      true,
    );
  });
});
