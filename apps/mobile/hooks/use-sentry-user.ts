import { useEffect } from 'react';
import { useMe } from './use-me';
import { setSentryUser } from '@/lib/monitoring/sentry';

export function useSentryUser(): void {
  const { data: me } = useMe();
  const id = me?.id;

  useEffect(() => {
    if (id) {
      setSentryUser({ id });
    } else {
      setSentryUser(null);
    }
  }, [id]);
}
