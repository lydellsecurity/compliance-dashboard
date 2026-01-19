import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

// Initialize theme on app load - default to light mode
// This runs before React hydrates to prevent flash of wrong theme
const THEME_KEY = 'compliance-dashboard-theme';
const LEGACY_DARK_MODE_KEY = 'attestai-dark-mode';

function initializeTheme() {
  const root = document.documentElement;

  // Check stored theme preference
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    return;
  }

  if (stored === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    return;
  }

  // Check legacy key for backward compatibility
  const legacyDarkMode = localStorage.getItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode !== null) {
    try {
      if (JSON.parse(legacyDarkMode)) {
        root.classList.add('dark');
        root.classList.remove('light');
        return;
      }
    } catch {
      // Fallback if parse fails
    }
  }

  // Default to light mode
  root.classList.add('light');
  root.classList.remove('dark');
}

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
