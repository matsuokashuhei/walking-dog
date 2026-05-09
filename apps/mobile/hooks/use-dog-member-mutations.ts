import { useMutation } from '@tanstack/react-query';
import type { DogInvitation } from '@/types/graphql';

function unsupportedMemberError(): Error {
  return new Error('Dog member APIs are not supported by the current GraphQL schema.');
}

// 犬へメンバーを招待するためのトークンを発行します。
export function useGenerateInvitation() {
  return useMutation<DogInvitation, Error, string>({
    mutationFn: async () => {
      throw unsupportedMemberError();
    },
  });
}

// メンバー削除後は所属情報が変わるため、ユーザー関連キャッシュを更新します。
export function useRemoveMember() {
  return useMutation<boolean, Error, { dogId: string; userId: string }>({
    mutationFn: async () => {
      throw unsupportedMemberError();
    },
  });
}

// 現在ユーザーが犬から抜けた後、所属犬一覧を最新化します。
export function useLeaveDog() {
  return useMutation<boolean, Error, string>({
    mutationFn: async () => {
      throw unsupportedMemberError();
    },
  });
}
