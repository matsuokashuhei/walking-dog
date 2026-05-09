import { useMutation } from '@tanstack/react-query';
import type { Encounter } from '@/types/graphql';

function unsupportedEncounterError(): Error {
  return new Error('Encounter APIs are not supported by the current GraphQL schema.');
}

// 犬同士の遭遇を記録し、友だち・遭遇関連のキャッシュを更新します。
export function useRecordEncounter() {
  return useMutation<Encounter[], Error, { myWalkId: string; theirWalkId: string }>({
    mutationFn: async () => {
      throw unsupportedEncounterError();
    },
  });
}

// 確定した遭遇時間をサーバーへ反映します。
export function useUpdateEncounterDuration() {
  return useMutation<
    boolean,
    Error,
    { myWalkId: string; theirWalkId: string; durationSec: number }
  >({
    mutationFn: async () => {
      throw unsupportedEncounterError();
    },
  });
}
