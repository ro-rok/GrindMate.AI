import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

const PING_INTERVAL = 25 * 60 * 1000; // 25 minutes
const PING_TIMEOUT = 15 * 1000; // 15 seconds
const PING_THRESHOLD = 500; // 500ms before showing loading

/**
 * Hook to wake up the backend when it's sleeping (serverless cold start).
 * Automatically pings the backend after 25 minutes of inactivity or when
 * the page becomes visible again.
 * 
 * Features:
 * - Ping interval guard (25 minutes)
 * - Loading toast after 500ms threshold
 * - Retry loop with 750ms interval
 * - 15-second timeout with error toast
 * - Event listeners for user interactions
 * - Cleanup on unmount
 */
export function useWakeBackend() {
  const lastPingTime = useRef(0);
  const pinging = useRef(false);
  const timeoutId = useRef(null);
  const thresholdId = useRef(null);
  const toastId = useRef(null);

  const pingBackend = useCallback(() => {
    // Guard: already pinging
    if (pinging.current) return;

    // Guard: too soon since last ping (25-minute interval)
    const now = Date.now();
    if (now - lastPingTime.current < PING_INTERVAL) return;

    pinging.current = true;
    let gaveUp = false;

    const showLoading = () => {
      toastId.current = toast.loading(
        <div className="flex flex-col">
          <span>Waking up backend<span className="animate-pulse text-blue-400"> ...</span></span>
          <span className="text-sm text-gray-400 mt-1">This may take a few seconds.</span>
        </div>,
        {
          style: {
            background: '#18181b',
            color: '#fff',
            fontSize: '1rem',
            minWidth: '260px',
          },
        }
      );

      // Set timeout to give up after 15 seconds
      timeoutId.current = setTimeout(() => {
        gaveUp = true;
        if (toastId.current) toast.dismiss(toastId.current);
        toast.error(
          <div className="flex flex-col">
            <span>Backend is taking longer than expected.</span>
            <span className="text-sm text-gray-400 mt-1">Please try again later.</span>
          </div>,
          {
            style: {
              background: '#18181b',
              color: '#fff',
              fontSize: '1rem',
              minWidth: '260px',
            },
          }
        );
        pinging.current = false;
      }, PING_TIMEOUT);
    };

    const tryPing = () => {
      if (gaveUp) return;

      api
        .get('/ping')
        .then(() => {
          // Success! Clear all timers and show success toast
          clearTimeout(thresholdId.current);
          if (timeoutId.current) clearTimeout(timeoutId.current);
          if (toastId.current) {
            toast.dismiss(toastId.current);
            toast.success(
              <div className="flex flex-col">
                <span>Backend is awake!</span>
                <span className="text-sm text-gray-400 mt-1">You can now use the app.</span>
              </div>,
              {
                style: {
                  background: '#18181b',
                  color: '#fff',
                  fontSize: '1rem',
                  minWidth: '220px',
                },
              }
            );
          }
          lastPingTime.current = Date.now();
          pinging.current = false;
        })
        .catch(() => {
          // Retry after 750ms if we haven't given up
          if (!gaveUp) {
            setTimeout(tryPing, 750);
          }
        });
    };

    // Show loading toast after 500ms threshold
    thresholdId.current = setTimeout(showLoading, PING_THRESHOLD);
    tryPing();
  }, []);

  useEffect(() => {
    const handler = () => {
      // Only ping if page is visible
      if (document.visibilityState === 'visible' || document.visibilityState === undefined) {
        pingBackend();
      }
    };

    // Listen to user interaction events
    const events = ['mousemove', 'mousedown', 'touchstart', 'visibilitychange'];
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    // Cleanup on unmount
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (thresholdId.current) clearTimeout(thresholdId.current);
      if (toastId.current) toast.dismiss(toastId.current);
    };
  }, [pingBackend]);

  return null;
}
