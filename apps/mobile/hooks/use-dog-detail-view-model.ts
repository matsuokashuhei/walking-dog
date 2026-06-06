import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { usePackProgress } from '@/hooks/use-pack-progress';
import { useMyWalks } from '@/hooks/use-walks';
import type { Dog, DogWithStats, Walk } from '@/types/graphql';

// 犬の誕生日から、詳細画面に出す短い年齢表示を作ります。
function computeAgeLabel(birthday: Dog['birthday'], now: Date = new Date()): string | null {
  if (!birthday?.year) return null;
  const month = birthday.month ?? 1;
  const day = birthday.day ?? 1;
  const birth = new Date(birthday.year, month - 1, day);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? `${age}y` : null;
}

function buildMeta(dog: Dog): string {
  const parts: string[] = [];
  const age = computeAgeLabel(dog.birthday);
  if (age) parts.push(age);
  if (dog.breed) parts.push(dog.breed);
  else if (dog.gender) parts.push(dog.gender);
  return parts.join(' · ');
}

// Dog 詳細画面で loading/ready を分岐するための ViewModel です。
interface DogDetailLoadingViewModel {
  status: 'loading';
}

interface DogDetailReadyViewModel {
  status: 'ready';
  dog: DogWithStats;
  meta: string;
  streakDays: number;
  dogWalks: Walk[];
  // 散歩履歴の取得に失敗したときだけ非 null。空配列と「失敗」を画面側で区別するために持ちます。
  walksError: Error | null;
  retryWalks: () => void;
  showDeleteConfirm: boolean;
  handleOpenWalk: (walkId: string) => void;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  handleDelete: () => Promise<void>;
}

export type DogDetailViewModel = DogDetailLoadingViewModel | DogDetailReadyViewModel;

// URL パラメータを起点に犬詳細、散歩履歴、権限、操作ハンドラを集約します。
export function useDogDetailViewModel(): DogDetailViewModel {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();

  const { data: dog, isLoading } = useDog(dogId ?? '', 'ALL');
  const { data: walks = [], error: walksErrorRaw, refetch: refetchWalks } = useMyWalks(100);
  const walksError = walksErrorRaw ?? null;
  const pack = usePackProgress();
  const { mutateAsync: deleteDog } = useDeleteDog();
  const runWithAlert = useMutationWithAlert();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 全散歩履歴から、現在表示している犬が参加した散歩だけを抽出します。
  const dogWalks = useMemo(
    () => (dog ? walks.filter((walk) => walk.dogs.some((walkDog) => walkDog.id === dog.id)) : []),
    [dog, walks],
  );

  const handleOpenWalk = useCallback(
    (walkId: string) => {
      router.push(`/walks/${walkId}`);
    },
    [router],
  );

  const retryWalks = useCallback(() => {
    void refetchWalks?.();
  }, [refetchWalks]);

  const openDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // 削除は共通のアラート処理を通し、成功時だけ犬一覧へ戻します。
  const handleDelete = useCallback(async () => {
    if (!dogId) return;
    const ok = await runWithAlert(() => deleteDog(dogId), 'dogs.detail.deleteError');
    if (ok) {
      router.replace('/(tabs)/dogs');
    }
  }, [deleteDog, dogId, router, runWithAlert]);

  // 詳細表示に必要なデータが揃うまで、画面側へ loading として返します。
  if (isLoading || !dog) {
    return { status: 'loading' };
  }

  return {
    status: 'ready',
    dog,
    meta: buildMeta(dog),
    streakDays: pack.perDog[dog.id]?.streakDays ?? 0,
    dogWalks,
    walksError,
    retryWalks,
    showDeleteConfirm,
    handleOpenWalk,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
  };
}
