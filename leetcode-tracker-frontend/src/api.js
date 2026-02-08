import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper function to get CSRF token
// The server returns the CSRF token in the response body (login/register/refresh)
// and also sets it as a cookie. Due to cross-origin restrictions, we store it in
// localStorage and send it in the X-CSRF-Token header. The server validates that
// the header matches the cookie (which is sent automatically with credentials).
function getCSRFToken() {
  const csrfToken = localStorage.getItem('csrf_token');
  
  if (!csrfToken) {
    console.warn('[CSRF Debug] No CSRF token found in localStorage');
  }
  
  return csrfToken;
}

// Auto-refresh CSRF token every 10 minutes
let csrfRefreshInterval = null;

function startCSRFRefresh() {
  // Clear any existing interval
  if (csrfRefreshInterval) {
    clearInterval(csrfRefreshInterval);
  }
  
  // Refresh CSRF token every 10 minutes (600000ms)
  csrfRefreshInterval = setInterval(async () => {
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
      
      if (response.status === 200 && response.data.csrf_token) {
        localStorage.setItem('csrf_token', response.data.csrf_token);
        if (process.env.NODE_ENV === 'development') {
          console.log('[CSRF] Token refreshed automatically');
        }
      }
    } catch (error) {
      // Silently fail - the next API call will trigger a refresh if needed
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CSRF] Auto-refresh failed:', error.message);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes
}

// Start CSRF refresh when module loads
startCSRFRefresh();

// Add request interceptor to include CSRF token
api.interceptors.request.use(
  config => {
    // Add CSRF token to state-changing requests
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (protectedMethods.includes(config.method?.toUpperCase())) {
      // Get CSRF token from cookie (source of truth)
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`[API] No CSRF token found for ${config.method} ${config.url}`);
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
    // If this is a refresh response, store CSRF token if present
    if (response.config.url.includes('/auth/refresh') && response.status === 200) {
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] Token refreshed successfully');
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear auth state
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] Token refresh failed:', refreshError.response?.status, refreshError.response?.data);
        }
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
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] 401 Unauthorized:', error.config?.url);
      }
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