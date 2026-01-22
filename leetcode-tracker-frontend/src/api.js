import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper function to get cookie value
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Add request interceptor to include CSRF token
api.interceptors.request.use(
  config => {
    // Add CSRF token to state-changing requests
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (protectedMethods.includes(config.method?.toUpperCase())) {
      // Try to get CSRF token from cookie first, then fall back to localStorage
      const csrfToken = getCookie('csrf_token') || localStorage.getItem('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for authentication state
api.interceptors.response.use(
  response => {
    // If this is a login response, store the user data and CSRF token
    if (response.config.url.includes('/users/sign_in') && response.status === 200) {
      localStorage.setItem('currentUser', JSON.stringify(response.data));
      if (response.data.csrf_token) {
        localStorage.setItem('csrf_token', response.data.csrf_token);
      }
    }
    // If this is a register response, store CSRF token
    if (response.config.url.includes('/users.json') && response.status === 201) {
      if (response.data.csrf_token) {
        localStorage.setItem('csrf_token', response.data.csrf_token);
      }
    }
    return response;
  }, 
  async error => {
    const originalRequest = error.config;
    
    // Handle 401 errors - session expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh the token
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.status === 200) {
          // Token refreshed successfully, retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear auth state
        localStorage.removeItem('currentUser');
        localStorage.removeItem('csrf_token');
        
        // Update auth store to reflect logged out state
        import('./store/authStore').then(module => {
          const useAuthStore = module.default;
          const currentState = useAuthStore.getState();
          if (currentState.isAuthenticated) {
            currentState.setUser(null);
          }
        });
        
        return Promise.reject(refreshError);
      }
    }
    
    // For other 401 errors or if refresh failed, clear auth state
    if (error.response?.status === 401) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('csrf_token');
      
      // Update auth store to reflect logged out state
      import('./store/authStore').then(module => {
        const useAuthStore = module.default;
        const currentState = useAuthStore.getState();
        if (currentState.isAuthenticated) {
          currentState.setUser(null);
        }
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;