import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './hooks/useAuth';
import AppWithAuth from './AppWithAuth';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  </React.StrictMode>
);
