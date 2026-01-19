/**
 * Connection Status Hook
 *
 * Monitors network connectivity and provides save state tracking.
 * Used to show offline warnings and prevent data loss.
 */

import { useState, useEffect, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface ConnectionStatusState {
  isOnline: boolean;
  lastSaveTime: Date | null;
  saveStatus: SaveStatus;
  pendingChanges: number;
  lastError: string | null;
}

export interface UseConnectionStatusReturn extends ConnectionStatusState {
  setLastSaveTime: (time: Date) => void;
  setSaveStatus: (status: SaveStatus) => void;
  incrementPendingChanges: () => void;
  clearPendingChanges: () => void;
  setError: (error: string | null) => void;
  formatLastSave: () => string;
}

export function useConnectionStatus(): UseConnectionStatusReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // If we were offline and have pending changes, notify user
      if (pendingChanges > 0) {
        console.log('[Connection] Back online with pending changes:', pendingChanges);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('offline');
      console.log('[Connection] Went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingChanges]);

  // Auto-clear saved status after a delay
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000); // Clear "saved" indicator after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const incrementPendingChanges = useCallback(() => {
    setPendingChanges(prev => prev + 1);
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges(0);
  }, []);

  const setError = useCallback((error: string | null) => {
    setLastError(error);
    if (error) {
      setSaveStatus('error');
    }
  }, []);

  const formatLastSave = useCallback(() => {
    if (!lastSaveTime) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSaveTime.getTime();

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return lastSaveTime.toLocaleDateString();
    }
  }, [lastSaveTime]);

  return {
    isOnline,
    lastSaveTime,
    saveStatus,
    pendingChanges,
    lastError,
    setLastSaveTime,
    setSaveStatus,
    incrementPendingChanges,
    clearPendingChanges,
    setError,
    formatLastSave,
  };
}

export default useConnectionStatus;
