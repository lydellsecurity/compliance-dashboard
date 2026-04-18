/**
 * useUrlState
 *
 * Read/write individual query-string keys (`?control=AC-001`, `?incident=…`)
 * without a router. Designed for opening drawers/detail views from a shared
 * link and keeping the URL in sync when the user dismisses them.
 *
 * Rules:
 *   - `replaceState` not `pushState` — opening a drawer isn't a history step,
 *     and spamming the back button with every drawer click degrades the
 *     escape hatch back to the previous page.
 *   - `popstate` listener keeps state in sync if the user hits back/forward.
 *   - Setting to `null` / empty removes the key entirely (keeps URLs clean).
 */

import { useCallback, useEffect, useState } from 'react';

export function useUrlState(key: string): [string | null, (value: string | null) => void] {
  const read = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(key);
  }, [key]);

  const [value, setValue] = useState<string | null>(read);

  useEffect(() => {
    const onPop = () => setValue(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [read]);

  const write = useCallback(
    (next: string | null) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      if (next == null || next === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, next);
      }
      if (url.toString() !== window.location.href) {
        window.history.replaceState({}, '', url.toString());
      }
      setValue(next);
    },
    [key]
  );

  return [value, write];
}
