import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add response interceptor for authentication state
api.interceptors.response.use(
  response => {
    // If this is a login response, store the user data
    if (response.config.url.includes('/users/sign_in') && response.status === 200) {
      localStorage.setItem('currentUser', JSON.stringify(response.data));
    }
    return response;
  }, 
  error => {
    // Don't log auth errors to console
    if (error.response?.status === 401) {
      // Clear stored user on auth errors
      localStorage.removeItem('currentUser');
    }
    return Promise.reject(error);
  }
);

export default api;