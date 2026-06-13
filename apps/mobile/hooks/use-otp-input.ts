import { useCallback, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

// OTP 入力欄の数字配列、フォーカス移動、完了判定をまとめて管理します。
export function useOtpInput(length: number) {
  const [digits, setDigits] = useState<string[]>(() =>
    new Array<string>(length).fill(''),
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>(
    new Array<TextInput | null>(length).fill(null),
  );

  const setDigit = useCallback(
    (index: number, value: string) => {
      const numericInput = value.replace(/[^0-9]/g, '');
      setDigits((prev) => {
        const next = [...prev];
        if (!numericInput) {
          next[index] = '';
          return next;
        }
        numericInput
          .slice(0, length - index)
          .split('')
          .forEach((digit, offset) => {
            next[index + offset] = digit;
          });
        return next;
      });
      if (numericInput) {
        const nextIndex = index + numericInput.length;
        if (nextIndex < length) {
          inputRefs.current[nextIndex]?.focus();
        }
      }
    },
    [length],
  );

  // 空欄で Backspace を押したときは、前の入力欄へ戻します。
  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && digits[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const setInputRef = useCallback(
    (index: number) => (ref: TextInput | null) => {
      inputRefs.current[index] = ref;
    },
    [],
  );

  const reset = useCallback(() => {
    setDigits(new Array<string>(length).fill(''));
  }, [length]);

  const code = digits.join('');
  const isComplete = code.length === length && digits.every((d) => d.length === 1);

  return {
    digits,
    code,
    isComplete,
    focusedIndex,
    setFocusedIndex,
    setDigit,
    handleKeyPress,
    setInputRef,
    reset,
  };
}
