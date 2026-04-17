import { act, renderHook } from '@testing-library/react-native';
import type { TextInput } from 'react-native';
import { useOtpInput } from './use-otp-input';

function makeMockInput(): TextInput & { focus: jest.Mock } {
  return { focus: jest.fn() } as unknown as TextInput & { focus: jest.Mock };
}

describe('useOtpInput', () => {
  it('initializes with empty digits, incomplete code, and no focus', () => {
    const { result } = renderHook(() => useOtpInput(6));
    expect(result.current.digits).toEqual(['', '', '', '', '', '']);
    expect(result.current.code).toBe('');
    expect(result.current.isComplete).toBe(false);
    expect(result.current.focusedIndex).toBeNull();
  });

  it('supports custom length', () => {
    const { result } = renderHook(() => useOtpInput(4));
    expect(result.current.digits).toHaveLength(4);
  });

  it('setDigit stores a single digit at the given index', () => {
    const { result } = renderHook(() => useOtpInput(6));
    act(() => {
      result.current.setDigit(0, '3');
    });
    expect(result.current.digits[0]).toBe('3');
    expect(result.current.code).toBe('3');
  });

  it('setDigit strips non-numeric characters', () => {
    const { result } = renderHook(() => useOtpInput(6));
    act(() => {
      result.current.setDigit(0, 'a5b');
    });
    expect(result.current.digits[0]).toBe('5');
  });

  it('setDigit keeps only the last character of multi-character input', () => {
    const { result } = renderHook(() => useOtpInput(6));
    act(() => {
      result.current.setDigit(0, '12');
    });
    expect(result.current.digits[0]).toBe('2');
  });

  it('setDigit with empty value clears the digit', () => {
    const { result } = renderHook(() => useOtpInput(6));
    act(() => {
      result.current.setDigit(0, '7');
    });
    act(() => {
      result.current.setDigit(0, '');
    });
    expect(result.current.digits[0]).toBe('');
  });

  it('setDigit advances focus to next input when a digit is entered', () => {
    const { result } = renderHook(() => useOtpInput(6));
    const input0 = makeMockInput();
    const input1 = makeMockInput();
    act(() => {
      result.current.setInputRef(0)(input0);
      result.current.setInputRef(1)(input1);
    });
    act(() => {
      result.current.setDigit(0, '4');
    });
    expect(input1.focus).toHaveBeenCalledTimes(1);
  });

  it('setDigit on the last index does not attempt to focus beyond the end', () => {
    const { result } = renderHook(() => useOtpInput(3));
    const input2 = makeMockInput();
    act(() => {
      result.current.setInputRef(2)(input2);
    });
    act(() => {
      result.current.setDigit(2, '9');
    });
    expect(input2.focus).not.toHaveBeenCalled();
  });

  it('setDigit with empty value does not advance focus', () => {
    const { result } = renderHook(() => useOtpInput(6));
    const input1 = makeMockInput();
    act(() => {
      result.current.setInputRef(1)(input1);
    });
    act(() => {
      result.current.setDigit(0, '');
    });
    expect(input1.focus).not.toHaveBeenCalled();
  });

  it('handleKeyPress Backspace on an empty digit focuses the previous input', () => {
    const { result } = renderHook(() => useOtpInput(6));
    const input0 = makeMockInput();
    act(() => {
      result.current.setInputRef(0)(input0);
    });
    act(() => {
      result.current.handleKeyPress(1, 'Backspace');
    });
    expect(input0.focus).toHaveBeenCalledTimes(1);
  });

  it('handleKeyPress Backspace on a non-empty digit does not change focus', () => {
    const { result } = renderHook(() => useOtpInput(6));
    const input0 = makeMockInput();
    act(() => {
      result.current.setInputRef(0)(input0);
      result.current.setDigit(1, '5');
    });
    act(() => {
      result.current.handleKeyPress(1, 'Backspace');
    });
    expect(input0.focus).not.toHaveBeenCalled();
  });

  it('handleKeyPress Backspace at index 0 does not try to go negative', () => {
    const { result } = renderHook(() => useOtpInput(6));
    expect(() => {
      act(() => {
        result.current.handleKeyPress(0, 'Backspace');
      });
    }).not.toThrow();
  });

  it('handleKeyPress with non-Backspace key is a no-op', () => {
    const { result } = renderHook(() => useOtpInput(6));
    const input0 = makeMockInput();
    act(() => {
      result.current.setInputRef(0)(input0);
    });
    act(() => {
      result.current.handleKeyPress(1, '5');
    });
    expect(input0.focus).not.toHaveBeenCalled();
  });

  it('isComplete is true when all digits are filled', () => {
    const { result } = renderHook(() => useOtpInput(4));
    act(() => {
      result.current.setDigit(0, '1');
      result.current.setDigit(1, '2');
      result.current.setDigit(2, '3');
      result.current.setDigit(3, '4');
    });
    expect(result.current.isComplete).toBe(true);
    expect(result.current.code).toBe('1234');
  });

  it('setFocusedIndex updates focusedIndex', () => {
    const { result } = renderHook(() => useOtpInput(6));
    act(() => {
      result.current.setFocusedIndex(2);
    });
    expect(result.current.focusedIndex).toBe(2);
    act(() => {
      result.current.setFocusedIndex(null);
    });
    expect(result.current.focusedIndex).toBeNull();
  });

  it('reset clears all digits', () => {
    const { result } = renderHook(() => useOtpInput(4));
    act(() => {
      result.current.setDigit(0, '1');
      result.current.setDigit(1, '2');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.digits).toEqual(['', '', '', '']);
    expect(result.current.code).toBe('');
  });
});
