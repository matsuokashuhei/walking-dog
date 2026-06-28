import { fireEvent, render, screen } from '@testing-library/react-native';
import { NativeFieldSection, NativeFieldRow } from './NativeFieldGroup';

describe('NativeFieldGroup', () => {
  it('wraps rows in a hosted field section', () => {
    render(
      <NativeFieldSection testID="profile-section">
        <NativeFieldRow label="Name" value="Mio" />
      </NativeFieldSection>,
    );

    expect(screen.getByTestId('profile-section-host')).toBeTruthy();
    expect(screen.getByTestId('profile-section')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Mio')).toBeTruthy();
  });

  it('gives the native field group a viewport height based on row count', () => {
    render(
      <NativeFieldSection testID="profile-section" title="Profile">
        <NativeFieldRow label="Name" />
        <NativeFieldRow label="Breed" />
      </NativeFieldSection>,
    );

    const hostStyle = screen.getByTestId('profile-section-host').props.style;
    expect(hostStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '100%' }),
        expect.objectContaining({ height: expect.any(Number) }),
      ]),
    );
  });

  it('hosts the native field group with viewport measurement instead of content matching', () => {
    render(
      <NativeFieldSection testID="profile-section">
        <NativeFieldRow label="Name" />
      </NativeFieldSection>,
    );

    const hostProps = screen.getByTestId('profile-section-host').props;
    expect(hostProps.useViewportSizeMeasurement).toBe(true);
    expect(hostProps.matchContents).toBeUndefined();
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
