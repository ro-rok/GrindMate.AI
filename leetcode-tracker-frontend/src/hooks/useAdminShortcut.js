import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAdminCheck from './useAdminCheck';

/**
 * Hook to handle CTRL+SHIFT+A keyboard shortcut for admin portal access
 * 
 * Behavior:
 * - Listens for CTRL+SHIFT+A combination
 * - Ignores shortcut when focus is in input/textarea/contentEditable elements
 * - Navigates to /admin if user is admin
 * - Shows "Unauthorized" toast if user is not admin
 * - Cleans up event listener on unmount
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
function useAdminShortcut() {
  const navigate = useNavigate();
  const isAdmin = useAdminCheck();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for CTRL+SHIFT+A combination
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        // Ignore if focus is in input/textarea/contentEditable elements (Requirement 2.3)
        const target = event.target;
        const isInputElement = 
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (isInputElement) {
          return; // Ignore shortcut
        }

        // Prevent default browser behavior
        event.preventDefault();

        // Check admin status and navigate or show toast (Requirements 2.1, 2.2)
        if (isAdmin) {
          navigate('/admin');
        } else {
          toast.error('Unauthorized', {
            style: {
              background: '#18181b',
              color: '#fff',
              fontSize: '1rem',
            },
          });
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on unmount (Requirement 2.4)
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, isAdmin]);
}

export default useAdminShortcut;
