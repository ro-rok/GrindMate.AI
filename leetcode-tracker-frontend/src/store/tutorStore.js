import { create } from 'zustand';

/**
 * AI Tutor store
 * Manages chat history, hint levels, and tutor mode
 */
const useTutorStore = create((set, get) => ({
  // State
  chatHistory: [], // Array of { role: 'user' | 'assistant', content: string, timestamp: number }
  currentHintLevel: 0,
  unlockedLevels: new Set(), // Set of unlocked hint levels (1-6)
  tutorMode: 'socratic', // 'socratic' | 'eli5' | 'interviewer'
  currentQuestionId: null,
  isLoading: false,
  error: null,
  rateBudget: {
    tokensRemaining: 25000,
    requestsRemaining: 30,
    resetAt: null,
  },

  // Actions
  setTutorMode: (mode) => set({ tutorMode: mode }),

  setCurrentQuestion: (questionId) => {
    // Reset state when switching questions
    if (questionId !== get().currentQuestionId) {
      set({
        currentQuestionId: questionId,
        chatHistory: [],
        currentHintLevel: 0,
        unlockedLevels: new Set(),
      });
    }
  },

  addMessage: (role, content) => {
    const message = {
      role,
      content,
      timestamp: Date.now(),
    };
    set({ chatHistory: [...get().chatHistory, message] });
  },

  clearChatHistory: () => set({ chatHistory: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setRateBudget: (budget) => set({ rateBudget: { ...get().rateBudget, ...budget } }),

  unlockHint: async (questionId, level, override = false) => {
    const state = get();
    
    // Check if already unlocked
    if (state.unlockedLevels.has(level)) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}/hints/${level}/unlock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ override }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to unlock hint');
      }

      const data = await response.json();

      // Update unlocked levels
      const newUnlockedLevels = new Set(state.unlockedLevels);
      newUnlockedLevels.add(level);

      // Add hint to chat history
      get().addMessage('assistant', data.hint_content);

      set({
        unlockedLevels: newUnlockedLevels,
        currentHintLevel: level,
        isLoading: false,
        error: null,
      });

      // Update rate budget if provided
      if (data.rate_budget_remaining !== undefined) {
        get().setRateBudget({
          tokensRemaining: data.rate_budget_remaining,
        });
      }

      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  sendMessage: async (questionId, message, code = null) => {
    const state = get();

    // Add user message to history
    get().addMessage('user', message);

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message,
            tutor_mode: state.tutorMode,
            code,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to send message');
      }

      const data = await response.json();

      // Add assistant response to history
      get().addMessage('assistant', data.response);

      set({
        isLoading: false,
        error: null,
      });

      // Update rate budget if provided
      if (data.rate_budget_remaining !== undefined) {
        get().setRateBudget({
          tokensRemaining: data.rate_budget_remaining,
        });
      }

      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadHintProgress: async (questionId) => {
    // Load hint unlock progress for a question
    // This would typically be fetched from the backend
    // For now, we'll just reset the state
    set({
      currentQuestionId: questionId,
      unlockedLevels: new Set(),
      currentHintLevel: 0,
      chatHistory: [],
    });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      chatHistory: [],
      currentHintLevel: 0,
      unlockedLevels: new Set(),
      currentQuestionId: null,
      isLoading: false,
      error: null,
    });
  },
}));

export default useTutorStore;
