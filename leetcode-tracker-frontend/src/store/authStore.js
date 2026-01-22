import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Authentication store
 * Manages user session, authentication state, and auth actions
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user, error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users/sign_in.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
          }

          const data = await response.json();
          
          // Store CSRF token for future requests
          if (data.csrf_token) {
            localStorage.setItem('csrf_token', data.csrf_token);
          }
          
          set({
            user: data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      register: async (email, password, timezone) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, timezone }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
          }

          const data = await response.json();
          
          // Store CSRF token for future requests
          if (data.csrf_token) {
            localStorage.setItem('csrf_token', data.csrf_token);
          }
          
          set({
            user: data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/users/sign_out.json`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'X-CSRF-Token': localStorage.getItem('csrf_token') || '',
            },
          });

          // Clear CSRF token
          localStorage.removeItem('csrf_token');
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      refreshToken: async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            // Refresh token expired or invalid, logout
            get().logout();
            return false;
          }

          const data = await response.json();
          
          // Update CSRF token
          if (data.csrf_token) {
            localStorage.setItem('csrf_token', data.csrf_token);
          }
          
          // Update user data if included in response
          if (data.user) {
            set({ user: data.user });
          }

          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
