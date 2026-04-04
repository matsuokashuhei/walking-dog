import type { StatsPeriod } from '@/types/graphql';

export const meKeys = {
  all: ['me'] as const,
};

export const dogKeys = {
  all: ['dogs'] as const,
  detail: (id: string, period: StatsPeriod) => ['dogs', id, period] as const,
  members: (id: string) => ['dogs', id, 'members'] as const,
};

export const walkKeys = {
  all: ['walks'] as const,
  detail: (id: string) => ['walks', id] as const,
  list: () => ['walks', 'list'] as const,
};
