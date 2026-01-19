import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

// Initialize theme on app load - default to light mode
// This runs before React hydrates to prevent flash of wrong theme
const THEME_KEY = 'compliance-dashboard-theme';

function initializeTheme() {
  const root = document.documentElement;

  // Only check the new theme key - ignore legacy key for fresh default
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    return;
  }

  // Default to light mode (corporate clean look)
  root.classList.add('light');
  root.classList.remove('dark');

  // Set the key to ensure consistent behavior
  if (!stored) {
    localStorage.setItem(THEME_KEY, 'light');
  }
}

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
