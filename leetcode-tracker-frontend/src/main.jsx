import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './index.css';
import './styles/tokens.css';
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from 'react-hot-toast';
import { LenisProvider } from './components/LenisProvider';
import SessionValidator from './components/SessionValidator';
import { initGSAP } from './utils/gsap';

// Initialize GSAP with global defaults
initGSAP();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LenisProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--black-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          },
          success: {
            iconTheme: {
              primary: 'var(--accent-success)',
              secondary: 'var(--black-base)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--accent-danger)',
              secondary: 'var(--black-base)',
            },
          },
        }}
        containerStyle={{
          top: 20,
          right: 20,
        }}
      />
      <SessionValidator />
      <RouterProvider router={router} />
      <Analytics />
    </LenisProvider>
  </React.StrictMode>
);
