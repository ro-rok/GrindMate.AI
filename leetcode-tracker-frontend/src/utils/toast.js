/**
 * Toast utility with deduplication
 * Prevents toast spam by tracking messages and updating counters
 */

import { toast as hotToast } from 'react-hot-toast';

// Track active toasts by message key
const activeToasts = new Map();
const DEDUPE_WINDOW_MS = 3000; // 3 seconds

/**
 * Generate a key for deduplication based on message content
 */
function getMessageKey(message) {
  if (typeof message === 'string') {
    return message;
  }
  // For React elements, use a hash of the content
  if (message?.props?.children) {
    return JSON.stringify(message.props.children);
  }
  return String(message);
}

/**
 * Show error toast with deduplication
 */
export function toastError(message, options = {}) {
  const key = getMessageKey(message);
  const now = Date.now();
  
  // Check if same message was shown recently
  const existing = activeToasts.get(key);
  
  if (existing && (now - existing.timestamp) < DEDUPE_WINDOW_MS) {
    // Update existing toast with counter
    existing.count += 1;
    existing.timestamp = now;
    
    const countMessage = existing.count > 1 
      ? `${typeof message === 'string' ? message : 'Error'} (x${existing.count})`
      : message;
    
    hotToast.error(countMessage, {
      ...options,
      id: existing.id, // Update existing toast
    });
    
    return existing.id;
  } else {
    // New toast
    const toastId = hotToast.error(message, {
      duration: 5000,
      position: 'top-right',
      ...options,
    });
    
    activeToasts.set(key, {
      id: toastId,
      count: 1,
      timestamp: now,
    });
    
    // Clean up after duration
    setTimeout(() => {
      activeToasts.delete(key);
    }, DEDUPE_WINDOW_MS);
    
    return toastId;
  }
}

/**
 * Show success toast
 */
export function toastSuccess(message, options = {}) {
  return hotToast.success(message, {
    duration: 3000,
    position: 'top-right',
    ...options,
  });
}

/**
 * Show info toast
 */
export function toastInfo(message, options = {}) {
  return hotToast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    ...options,
  });
}

/**
 * Show loading toast
 */
export function toastLoading(message, options = {}) {
  return hotToast.loading(message, {
    position: 'top-right',
    ...options,
  });
}

/**
 * Dismiss toast
 */
export function toastDismiss(toastId) {
  hotToast.dismiss(toastId);
}

/**
 * Export default toast object for compatibility
 */
export default {
  error: toastError,
  success: toastSuccess,
  info: toastInfo,
  loading: toastLoading,
  dismiss: toastDismiss,
  // Also export original for cases where we need it
  _original: hotToast,
};
