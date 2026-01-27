import React from 'react';
import { useWakeBackend } from '../hooks/useWakeBackend';

/**
 * Global provider that wires the "wake backend" cursor/visibility listener
 * into the routed application.
 *
 * It renders nothing visually; it just runs the hook so that the
 * react-hot-toast notifications appear when the backend is being pinged.
 */
export default function BackendWakeProvider() {
  useWakeBackend();
  return null;
}

