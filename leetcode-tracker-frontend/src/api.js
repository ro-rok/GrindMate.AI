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
  if (parts.length === 2) {
    const cookieValue = parts.pop().split(';').shift();
    console.log(`[CSRF Debug] getCookie('${name}') = '${cookieValue}'`);
    return cookieValue;
  }
  console.log(`[CSRF Debug] getCookie('${name}') = null (not found in cookies: ${document.cookie})`);
  return null;
}

// Helper function to fetch CSRF token from server if not available locally
async function ensureCSRFToken() {
  // Check localStorage first
  let csrfToken = localStorage.getItem('csrf_token');
  if (csrfToken) {
    return csrfToken;
  }
  
  // Try to read from cookie
  csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    // Store in localStorage for future use
    localStorage.setItem('csrf_token', csrfToken);
    return csrfToken;
  }
  
  // Fetch from server as last resort
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/csrf-token`,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data?.csrf_token) {
      localStorage.setItem('csrf_token', response.data.csrf_token);
      console.log('[CSRF Debug] Fetched CSRF token from server');
      return response.data.csrf_token;
    }
  } catch (error) {
    console.error('[CSRF Debug] Failed to fetch CSRF token from server:', error);
  }
  
  return null;
}

// Add request interceptor to include CSRF token
api.interceptors.request.use(
  async config => {
    // Add CSRF token to state-changing requests
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (protectedMethods.includes(config.method?.toUpperCase())) {
      // Ensure we have a CSRF token
      const csrfToken = await ensureCSRFToken();
      console.log(`[CSRF Debug] Request ${config.method} ${config.url} - CSRF token: ${csrfToken ? 'present' : 'missing'}`);
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        console.log(`[CSRF Debug] Added X-CSRF-Token header: ${csrfToken.substring(0, 10)}...`);
      } else {
        console.warn(`[CSRF Debug] No CSRF token found for ${config.method} ${config.url}`);
        console.warn(`[CSRF Debug] document.cookie = '${document.cookie}'`);
        console.warn(`[CSRF Debug] localStorage.csrf_token = '${localStorage.getItem('csrf_token')}'`);
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
        console.log('[CSRF Debug] Stored CSRF token from login response');
      }
    }
    // If this is a register response, store CSRF token
    if (response.config.url.includes('/users.json') && response.status === 201) {
      if (response.data.csrf_token) {
        localStorage.setItem('csrf_token', response.data.csrf_token);
        console.log('[CSRF Debug] Stored CSRF token from register response');
      }
    }
    // If this is a refresh response, store CSRF token if present
    if (response.config.url.includes('/auth/refresh') && response.status === 200) {
      if (response.data.csrf_token) {
        localStorage.setItem('csrf_token', response.data.csrf_token);
        console.log('[CSRF Debug] Stored CSRF token from refresh response');
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