import type { StatsPeriod } from '@/types/graphql';

export const meKeys = {
  all: ['me'] as const,
};

export const dogKeys = {
  all: ['dogs'] as const,
  detail: (id: string, period: StatsPeriod) => ['dogs', id, period] as const,
};
