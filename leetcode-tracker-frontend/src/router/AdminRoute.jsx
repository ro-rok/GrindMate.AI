import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAdminCheck from '../hooks/useAdminCheck';
import useUIStore from '../store/uiStore';

/**
 * Admin Route Guard
 * Protects admin-only routes by checking admin privileges
 * 
 * If user is not admin:
 * - Redirects to home page
 * - Shows unauthorized toast message
 * 
 * If user is admin:
 * - Renders children components
 * 
 * Requirements: 1.5, 18.3
 */
function AdminRoute({ children }) {
  const isAdmin = useAdminCheck();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (!isAdmin) {
      showToast('Unauthorized: Admin access required', 'error');
    }
  }, [isAdmin, showToast]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
