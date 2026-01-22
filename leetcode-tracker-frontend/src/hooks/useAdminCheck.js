import { useMemo } from 'react';
import useAuthStore from '../store/authStore';

/**
 * Hook to check if current user has admin privileges
 * 
 * Admin access is granted if:
 * - user.role === "admin" OR
 * - user.email === "therock17899@gmail.com"
 * 
 * @returns {boolean} isAdmin - True if user has admin privileges
 * 
 * Requirements: 1.5, 17.3
 */
function useAdminCheck() {
  const user = useAuthStore((state) => state.user);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    
    // Check if user has admin role
    if (user.role === 'admin') return true;
    
    // Check if user email is in admin allowlist
    if (user.email === 'therock17899@gmail.com') return true;
    
    return false;
  }, [user]);

  return isAdmin;
}

export default useAdminCheck;
