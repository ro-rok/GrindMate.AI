import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to include CSRF token
api.interceptors.request.use(
  config => {
    // Add CSRF token to state-changing requests
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (protectedMethods.includes(config.method?.toUpperCase())) {
      const csrfToken = localStorage.getItem('csrf_token');
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
  error => {
    // Don't log auth errors to console
    if (error.response?.status === 401) {
      // Clear stored user and CSRF token on auth errors
      localStorage.removeItem('currentUser');
      localStorage.removeItem('csrf_token');
    }
    return Promise.reject(error);
  }
);

export default api;