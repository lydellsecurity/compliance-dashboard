/**
 * Shared Modal primitive.
 *
 * Consolidates behaviours every modal in the app needs:
 *   - ESC to close (via useEscapeKey).
 *   - Focus trap: Tab and Shift-Tab cycle within the modal.
 *   - Initial focus moves into the modal on open.
 *   - Previously-focused element is restored on close.
 *   - Body scroll lock while open.
 *   - Backdrop click to close (opt-out for destructive modals via
 *     `dismissOnBackdrop={false}`).
 *   - Correct ARIA: `role="dialog"`, `aria-modal`, `aria-labelledby`, and
 *     `aria-describedby` wired automatically when `title` is passed.
 *   - Responsive sizing via Tailwind max-w tokens.
 *
 * Use for any overlay UI that needs dismissal affordance. For non-dismissable
 * flows (e.g. a full-screen onboarding wizard controlled by the caller's
 * state machine) prefer a regular layout component, not a Modal.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

// ============================================================================
// TYPES
// ============================================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
type ModalVariant = 'centered' | 'drawer-right' | 'drawer-left';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Accessible title. Required for screen readers; if you need a custom
   * header element, pass `titleNode` instead — but keep `title` set so
   * `aria-labelledby` resolves.
   */
  title?: string;
  /** Optional non-semantic title renderer; ignored if `title` is unset. */
  titleNode?: React.ReactNode;
  /** Short description read after the title. */
  description?: string;
  size?: ModalSize;
  /** 'centered' (default) | 'drawer-right' | 'drawer-left'. */
  variant?: ModalVariant;
  /** Disable close-on-backdrop-click (destructive confirmations). */
  dismissOnBackdrop?: boolean;
  /** Disable ESC-to-close. Defaults to true. */
  dismissOnEscape?: boolean;
  /** Hide the default close "X" button (e.g. when flow is controlled). */
  hideCloseButton?: boolean;
  /**
   * DOM id of the element to focus on open. If unset, the first focusable
   * element inside the modal is focused. If no focusable element is found,
   * the modal container itself receives focus.
   */
  initialFocusId?: string;
  /** Optional custom footer — sticks to the bottom of the scroll region. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// ============================================================================
// STACK TRACKING (z-index + ESC dispatch for nested modals)
// ============================================================================

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

const ModalStackContext = createContext<{ depth: number }>({ depth: 0 });

// ============================================================================
// COMPONENT
// ============================================================================

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  titleNode,
  description,
  size = 'lg',
  variant = 'centered',
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  hideCloseButton = false,
  initialFocusId,
  footer,
  children,
}) => {
  const { depth: parentDepth } = useContext(ModalStackContext);
  const depth = parentDepth + 1;

  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEscapeKey(open ? onClose : null, open && dismissOnEscape);

  // Lock body scroll while any modal is open. Uses a counter-safe approach so
  // nested modals don't double-lock / prematurely unlock.
  useLayoutEffect(() => {
    if (!open) return;
    const body = document.body;
    const prev = body.style.overflow;
    const w = window as unknown as { __modalOpenCount?: number };
    const count = (w.__modalOpenCount ?? 0) + 1;
    w.__modalOpenCount = count;
    if (count === 1) body.style.overflow = 'hidden';
    return () => {
      const next = (w.__modalOpenCount ?? 1) - 1;
      w.__modalOpenCount = next;
      if (next === 0) body.style.overflow = prev;
    };
  }, [open]);

  // Move focus into the modal when it opens; restore when it closes.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Next frame so Framer Motion has actually mounted the content.
    const raf = requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) return;

      let target: HTMLElement | null = null;
      if (initialFocusId) {
        target = document.getElementById(initialFocusId);
      }
      if (!target) {
        target = findFirstFocusable(container);
      }
      if (!target) {
        container.tabIndex = -1;
        target = container;
      }
      target.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open, initialFocusId]);

  // Focus trap: intercept Tab inside the modal.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = contentRef.current;
      if (!container) return;
      const focusables = getFocusables(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleBackdrop = useCallback(() => {
    if (dismissOnBackdrop) onClose();
  }, [dismissOnBackdrop, onClose]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // Z-scale: nested modals bump up by 10 so backdrops layer correctly.
  const zIndex = 40 + depth * 10;

  const isDrawer = variant === 'drawer-right' || variant === 'drawer-left';
  const drawerSide = variant === 'drawer-left' ? 'left-0' : 'right-0';

  // Motion variants — centered scales in; drawers slide in from their side.
  const contentMotion = isDrawer
    ? {
        initial: { x: variant === 'drawer-left' ? '-100%' : '100%' },
        animate: { x: 0 },
        exit: { x: variant === 'drawer-left' ? '-100%' : '100%' },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 4 },
      };

  const backdropLayout = isDrawer
    ? 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm'
    : 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6';

  const contentLayout = isDrawer
    ? `fixed top-0 ${drawerSide} h-full w-full ${SIZE_CLASSES[size]} bg-white dark:bg-midnight-800 border-l border-slate-200 dark:border-steel-700 shadow-2xl flex flex-col`
    : `w-full ${SIZE_CLASSES[size]} bg-white dark:bg-midnight-800 rounded-2xl border border-slate-200 dark:border-steel-700 shadow-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col`;

  return (
    <AnimatePresence>
      {open && (
        <ModalStackContext.Provider value={{ depth }}>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdrop}
            className={backdropLayout}
            style={{ zIndex }}
          >
            <motion.div
              key="content"
              ref={contentRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
              onClick={stop}
              initial={contentMotion.initial}
              animate={contentMotion.animate}
              exit={contentMotion.exit}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className={contentLayout}
            >
              {(title || titleNode || !hideCloseButton) && (
                <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-200 dark:border-steel-700">
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2
                        id={titleId}
                        className="text-lg font-semibold text-slate-900 dark:text-steel-100"
                      >
                        {title}
                      </h2>
                    )}
                    {titleNode && !title && titleNode}
                    {description && (
                      <p
                        id={descriptionId}
                        className="text-sm text-slate-500 dark:text-steel-400 mt-1"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                  {!hideCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close dialog"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-steel-200 p-1 -m-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto scrollbar-slim">{children}</div>

              {footer && (
                <div className="border-t border-slate-200 dark:border-steel-700 p-4 sm:p-5 bg-slate-50 dark:bg-midnight-900">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        </ModalStackContext.Provider>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// FOCUS HELPERS
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('data-focus-skip') && el.offsetParent !== null
  );
}

function findFirstFocusable(root: HTMLElement): HTMLElement | null {
  const all = getFocusables(root);
  return all[0] ?? null;
}
