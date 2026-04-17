import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

const THEME_KEY = 'compliance-dashboard-theme';
const MIGRATION_KEY = 'theme-migrated-v2';

// localStorage throws in private browsing / quota-exceeded / disabled-cookies.
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: theme state will reset per session in incognito, which is fine.
  }
}

function initializeTheme() {
  const root = document.documentElement;

  // One-time migration to light-mode default.
  if (!safeGetItem(MIGRATION_KEY)) {
    safeSetItem(THEME_KEY, 'light');
    safeSetItem(MIGRATION_KEY, 'true');
  }

  const stored = safeGetItem(THEME_KEY);
  if (stored === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    return;
  }

  root.classList.add('light');
  root.classList.remove('dark');
}

// Surface otherwise-silent async failures. We added a 3s Supabase fetch
// timeout, so unhandled rejections are now more common and worth logging
// centrally rather than letting each call site re-implement handling.
function installGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason);
  });

  window.addEventListener('error', (event) => {
    console.error('[uncaught error]', event.error ?? event.message);
  });
}

initializeTheme();
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
