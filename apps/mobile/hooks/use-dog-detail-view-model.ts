import { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDog } from '@/hooks/use-dog';
import { aggregatePackProgress } from '@/hooks/use-pack-progress';
import type { GoalCycleDays } from '@/constants/walk';
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
  goalProgress: {
    progressMinutes: number;
    goalMinutes: number;
    goalCycleDays: GoalCycleDays;
    progressPct: number;
  };
  dogWalks: Walk[];
  // 散歩履歴の取得に失敗したときだけ非 null。空配列と「失敗」を画面側で区別するために持ちます。
  walksError: Error | null;
  retryWalks: () => void;
  handleOpenWalk: (walkId: string) => void;
}

export type DogDetailViewModel = DogDetailLoadingViewModel | DogDetailReadyViewModel;

// URL パラメータを起点に犬詳細、散歩履歴、操作ハンドラを集約します。
export function useDogDetailViewModel(): DogDetailViewModel {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();

  const { data: dog, isLoading } = useDog(dogId ?? '', 'ALL');
  const { data: walks = [], error: walksErrorRaw, refetch: refetchWalks } = useMyWalks(100);
  const walksError = walksErrorRaw ?? null;

  // 全散歩履歴から、現在表示している犬が参加した散歩だけを抽出します。
  const dogWalks = useMemo(
    () => (dog ? walks.filter((walk) => walk.dogs.some((walkDog) => walkDog.id === dog.id)) : []),
    [dog, walks],
  );
  const dogProgress = useMemo(
    () => (dog ? aggregatePackProgress(walks, [dog]).perDog[dog.id] : null),
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

  // 詳細表示に必要なデータが揃うまで、画面側へ loading として返します。
  if (isLoading || !dog) {
    return { status: 'loading' };
  }
  const readyDogProgress = dogProgress!;
  const progressPct =
    readyDogProgress.goalMinutes > 0
      ? Math.min(
          100,
          Math.round(
            (readyDogProgress.goalProgressMinutes / readyDogProgress.goalMinutes) * 100,
          ),
        )
      : 0;

  return {
    status: 'ready',
    dog,
    meta: buildMeta(dog),
    streakDays: readyDogProgress.streakDays,
    goalProgress: {
      progressMinutes: readyDogProgress.goalProgressMinutes,
      goalMinutes: readyDogProgress.goalMinutes,
      goalCycleDays: readyDogProgress.goalCycleDays,
      progressPct,
    },
    dogWalks,
    walksError,
    retryWalks,
    handleOpenWalk,
  };
}
