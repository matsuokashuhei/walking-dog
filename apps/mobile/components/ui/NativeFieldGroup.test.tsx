import { fireEvent, render, screen } from '@testing-library/react-native';
import { NativeFieldSection, NativeFieldRow } from './NativeFieldGroup';

describe('NativeFieldGroup', () => {
  it('renders rows in a static field section without a hosted scroll container', () => {
    render(
      <NativeFieldSection testID="profile-section">
        <NativeFieldRow label="Name" value="Mio" />
      </NativeFieldSection>,
    );

    expect(screen.queryByTestId('profile-section-host')).toBeNull();
    expect(screen.getByTestId('profile-section')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Mio')).toBeTruthy();
  });

  it('renders the section title and separators in the static field section', () => {
    render(
      <NativeFieldSection testID="profile-section" title="Profile">
        <NativeFieldRow label="Name" />
        <NativeFieldRow label="Breed" />
      </NativeFieldSection>,
    );

    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByTestId('profile-section-separator-0')).toBeTruthy();
  });

  it('hosts each native row with content matching instead of viewport measurement', () => {
    render(
      <NativeFieldSection testID="profile-section">
        <NativeFieldRow label="Name" testID="name-row" />
      </NativeFieldSection>,
    );

    const rowHostProps = screen.getByTestId('name-row-host').props;
    expect(rowHostProps.matchContents).toEqual({ vertical: true });
    expect(rowHostProps.useViewportSizeMeasurement).toBeUndefined();
  });

  it('fires row actions from the native row surface', () => {
    const onPress = jest.fn();
    render(
      <NativeFieldSection>
        <NativeFieldRow label="Language" value="English" onPress={onPress} testID="language-row" />
      </NativeFieldSection>,
    );

    fireEvent.press(screen.getByTestId('language-row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
