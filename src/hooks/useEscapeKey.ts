import { useEffect } from 'react';

/**
 * Fire a handler when the user presses Escape. Useful for dismissing modals
 * and popovers with the keyboard — required for WCAG 2.1 AA and assumed by
 * SOC2/ISO27001 accessibility controls.
 *
 * Pass `enabled: false` (or omit the handler) to skip attaching the listener,
 * so a closed modal doesn't compete with an open one for the Escape key.
 */
export function useEscapeKey(handler: (() => void) | null, enabled = true): void {
  useEffect(() => {
    if (!enabled || !handler) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}
