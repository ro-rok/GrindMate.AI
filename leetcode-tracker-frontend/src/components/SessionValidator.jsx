import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

/**
 * SessionValidator component
 * Validates the user's session on app load
 * Automatically refreshes the access token if the refresh token is valid
 */
function SessionValidator() {
  const validateSession = useAuthStore((state) => state.validateSession);

  useEffect(() => {
    // Validate session on mount
    validateSession();
  }, [validateSession]);

  return null; // This component doesn't render anything
}

export default SessionValidator;
