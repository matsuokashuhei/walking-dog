import { render, screen, fireEvent } from '@testing-library/react-native';
import { DogMembersList } from './DogMembersList';
import type { DogMember } from '@/types/graphql';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const members: DogMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    role: 'owner',
    user: { displayName: 'Alice', avatarUrl: 'https://example.com/alice.jpg' },
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'member-2',
    userId: 'user-2',
    role: 'member',
    user: { displayName: 'Bob', avatarUrl: null },
    createdAt: '2026-02-01T00:00:00Z',
  },
];

describe('DogMembersList', () => {
  it('renders all members with names and roles', () => {
    render(
      <DogMembersList
        members={members}
        currentUserId="user-1"
        isOwner
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText('Member')).toBeTruthy();
  });

  it('shows remove button for non-owner members when current user is owner', () => {
    const onRemove = jest.fn();
    render(
      <DogMembersList
        members={members}
        currentUserId="user-1"
        isOwner
        onRemove={onRemove}
      />,
    );
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(1);
    fireEvent.press(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('user-2', 'Bob');
  });

  it('does not show remove buttons when current user is not owner', () => {
    render(
      <DogMembersList
        members={members}
        currentUserId="user-2"
        isOwner={false}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.queryAllByText('Remove')).toHaveLength(0);
  });

  it('renders initials when avatar is null', () => {
    render(
      <DogMembersList
        members={members}
        currentUserId="user-1"
        isOwner
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('B')).toBeTruthy();
  });
});
