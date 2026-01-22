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
      <Toaster />
      <SessionValidator />
      <RouterProvider router={router} />
      <Analytics />
    </LenisProvider>
  </React.StrictMode>
);
