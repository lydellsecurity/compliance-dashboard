/**
 * Connection Status Indicator Component
 *
 * Shows save status and offline warnings in the UI.
 * Designed for use in headers/toolbars of data-entry screens.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Cloud, CloudOff, Check, AlertCircle, Loader2,
} from 'lucide-react';
import type { SaveStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusIndicatorProps {
  isOnline: boolean;
  saveStatus: SaveStatus;
  lastSaveFormatted: string;
  pendingChanges?: number;
  lastError?: string | null;
  compact?: boolean;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  isOnline,
  saveStatus,
  lastSaveFormatted,
  pendingChanges = 0,
  lastError,
  compact = false,
}) => {
  // Offline banner - highest priority
  if (!isOnline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
          compact
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
        }`}
      >
        <WifiOff className="w-4 h-4" />
        <span>Offline</span>
        {pendingChanges > 0 && (
          <span className="text-xs opacity-75">
            ({pendingChanges} change{pendingChanges > 1 ? 's' : ''} pending)
          </span>
        )}
      </motion.div>
    );
  }

  // Error state
  if (saveStatus === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
          compact
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}
        title={lastError || 'Save failed'}
      >
        <AlertCircle className="w-4 h-4" />
        <span>Save failed</span>
      </motion.div>
    );
  }

  // Saving state
  if (saveStatus === 'saving') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
          compact
            ? 'text-secondary'
            : 'bg-slate-50 dark:bg-steel-800 text-secondary border border-slate-200 dark:border-steel-700'
        }`}
      >
        <Loader2 className="w-4 h-4 animate-spin text-accent-500" />
        <span>Saving...</span>
      </motion.div>
    );
  }

  // Saved state (temporary)
  if (saveStatus === 'saved') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
          compact
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
        }`}
      >
        <Check className="w-4 h-4" />
        <span>Saved</span>
      </motion.div>
    );
  }

  // Idle/normal state - show last save time
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-tertiary">
        <Cloud className="w-3 h-3" />
        <span>{lastSaveFormatted}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary">
      <Wifi className="w-4 h-4 text-emerald-500" />
      <span className="text-tertiary">Saved {lastSaveFormatted}</span>
    </div>
  );
};

/**
 * Full-width offline banner for prominent display
 */
export const OfflineBanner: React.FC<{
  isOnline: boolean;
  pendingChanges?: number;
  onRetry?: () => void;
}> = ({ isOnline, pendingChanges = 0, onRetry }) => {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  You&apos;re offline
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {pendingChanges > 0
                    ? `${pendingChanges} change${pendingChanges > 1 ? 's' : ''} will sync when connected`
                    : 'Changes will be saved when you reconnect'}
                </p>
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatusIndicator;
