import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { captureGraphQLError } from '@/lib/monitoring/sentry';
import { useMutationWithAlert } from './use-mutation-with-alert';

jest.mock('@/lib/monitoring/sentry', () => ({
  captureGraphQLError: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useMutationWithAlert', () => {
  const captureGraphQLErrorMock = captureGraphQLError as jest.MockedFunction<
    typeof captureGraphQLError
  >;

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    captureGraphQLErrorMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the mutation result when the operation succeeds', async () => {
    const { result } = renderHook(() => useMutationWithAlert());

    let value: string | null = null;
    await act(async () => {
      value = await result.current(
        () => Promise.resolve('ok'),
        'dogs.detail.deleteError',
      );
    });

    expect(value).toBe('ok');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows an alert with the i18n key and returns null on error', async () => {
    const { result } = renderHook(() => useMutationWithAlert());
    const boom = new Error('boom');

    let value: string | null = 'sentinel';
    await act(async () => {
      value = await result.current(
        () => Promise.reject(boom),
        'dogs.members.inviteError',
      );
    });

    expect(value).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'dogs.members.inviteError');
    expect(captureGraphQLErrorMock).toHaveBeenCalledWith(boom, undefined);
  });

  it('resolves the message key from the thrown error and reports context', async () => {
    const { result } = renderHook(() => useMutationWithAlert());
    const boom = new Error('boom');

    let value: string | null = 'sentinel';
    await act(async () => {
      value = await result.current(
        () => Promise.reject(boom),
        (error) =>
          error === boom ? 'walk.event.photoUploadError' : 'walk.event.recordError',
        { operation: 'recordWalkEvent' },
      );
    });

    expect(value).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'walk.event.photoUploadError');
    expect(captureGraphQLErrorMock).toHaveBeenCalledWith(boom, {
      operation: 'recordWalkEvent',
    });
  });
});
