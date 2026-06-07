import { useMutation } from '@tanstack/react-query';
import {
  changeEmail,
  changePassword,
  confirmEmailChange,
} from '@/lib/auth/api';
import type {
  ChangeEmailInput,
  ChangePasswordInput,
  ConfirmEmailChangeInput,
} from '@/types/graphql';

export function useChangeEmail() {
  return useMutation<boolean, Error, ChangeEmailInput>({
    mutationFn: ({ newEmail }) => changeEmail(newEmail),
  });
}

export function useConfirmEmailChange() {
  return useMutation<boolean, Error, ConfirmEmailChangeInput>({
    mutationFn: ({ code }) => confirmEmailChange(code),
  });
}

export function useChangePassword() {
  return useMutation<boolean, Error, ChangePasswordInput>({
    mutationFn: ({ oldPassword, newPassword }) =>
      changePassword(oldPassword, newPassword),
  });
}
