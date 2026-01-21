import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/tokens.css';
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from 'react-hot-toast';
import { LenisProvider } from './components/LenisProvider';
import { initGSAP } from './utils/gsap';

// Initialize GSAP with global defaults
initGSAP();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LenisProvider>
      <Toaster />
      <App />
      <Analytics />
    </LenisProvider>
  </React.StrictMode>
);
