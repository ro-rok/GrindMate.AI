import { create } from 'zustand';

/**
 * UI store
 * Manages UI state like modals, toasts, and focus mode
 */
const useUIStore = create((set, get) => ({
  // State
  focusModeOpen: false,
  currentQuestionId: null,
  toasts: [], // Array of { id, message, type: 'success' | 'error' | 'info' | 'warning', duration }
  modals: {}, // Object of modal states { modalName: boolean }
  sidebarOpen: true,
  theme: 'dark', // Future: support light mode

  // Actions
  openFocusMode: (questionId) => {
    set({
      focusModeOpen: true,
      currentQuestionId: questionId,
    });
  },

  closeFocusMode: () => {
    set({
      focusModeOpen: false,
      currentQuestionId: null,
    });
  },

  showToast: (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    set({ toasts: [...get().toasts, toast] });

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  openModal: (modalName) => {
    set({ modals: { ...get().modals, [modalName]: true } });
  },

  closeModal: (modalName) => {
    set({ modals: { ...get().modals, [modalName]: false } });
  },

  toggleModal: (modalName) => {
    const isOpen = get().modals[modalName];
    set({ modals: { ...get().modals, [modalName]: !isOpen } });
  },

  closeAllModals: () => {
    set({ modals: {} });
  },

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setTheme: (theme) => {
    set({ theme });
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
  },
}));

export default useUIStore;
