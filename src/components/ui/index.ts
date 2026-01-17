/**
 * UI Components Index
 *
 * Centralized exports for all UI utility components.
 */

// Toast notifications
export { ToastProvider, useToast } from './Toast';
export type { Toast, ToastType } from './Toast';

// Error boundaries
export {
  ErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
} from './ErrorBoundary';

// Loading skeletons
export {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  StatCardSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ProfileSkeleton,
} from './Skeleton';

// Command palette
export { CommandPalette, useCommandPalette } from './CommandPalette';
export type { CommandItem, CommandCategory } from './CommandPalette';
