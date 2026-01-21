import { create } from 'zustand';

/**
 * Question store
 * Manages question list, filters, pagination, and caching
 */
const useQuestionStore = create((set, get) => ({
  // State
  questions: [],
  filters: {
    company: null,
    timeframe: '30_days',
    difficulty: null,
    topics: [],
    patterns: [],
    search: '',
    sort: 'priority',
  },
  pagination: {
    cursor: null,
    hasMore: false,
    limit: 50,
  },
  cache: new Map(), // Cache key: stringified filters -> { questions, timestamp }
  isLoading: false,
  error: null,
  totalCount: 0,

  // Actions
  setQuestions: (questions) => set({ questions }),

  appendQuestions: (newQuestions) => {
    const current = get().questions;
    set({ questions: [...current, ...newQuestions] });
  },

  setFilters: (filters) => {
    set({
      filters: { ...get().filters, ...filters },
      pagination: { ...get().pagination, cursor: null }, // Reset pagination on filter change
    });
  },

  resetFilters: () => {
    set({
      filters: {
        company: null,
        timeframe: '30_days',
        difficulty: null,
        topics: [],
        patterns: [],
        search: '',
        sort: 'priority',
      },
      pagination: { cursor: null, hasMore: false, limit: 50 },
    });
  },

  setPagination: (pagination) => {
    set({ pagination: { ...get().pagination, ...pagination } });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setTotalCount: (totalCount) => set({ totalCount }),

  fetchQuestions: async (companyId, options = {}) => {
    const { append = false } = options;
    const state = get();
    const { filters, pagination } = state;

    // Build cache key
    const cacheKey = JSON.stringify({
      companyId,
      ...filters,
      cursor: append ? pagination.cursor : null,
    });

    // Check cache (5 minute TTL)
    const cached = state.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      if (append) {
        get().appendQuestions(cached.questions);
      } else {
        set({ questions: cached.questions });
      }
      set({
        pagination: cached.pagination,
        totalCount: cached.totalCount,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.timeframe) params.append('timeframe', filters.timeframe);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.topics.length > 0) params.append('topics', filters.topics.join(','));
      if (filters.patterns.length > 0) params.append('patterns', filters.patterns.join(','));
      if (filters.search) params.append('q', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      if (append && pagination.cursor) params.append('cursor', pagination.cursor);
      params.append('limit', pagination.limit.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/companies/${companyId}/questions?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();

      // Update cache
      const newCache = new Map(state.cache);
      newCache.set(cacheKey, {
        questions: data.questions,
        pagination: {
          cursor: data.next_cursor,
          hasMore: data.has_more,
          limit: pagination.limit,
        },
        totalCount: data.total_count,
        timestamp: Date.now(),
      });

      // Limit cache size to 20 entries
      if (newCache.size > 20) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }

      if (append) {
        get().appendQuestions(data.questions);
      } else {
        set({ questions: data.questions });
      }

      set({
        pagination: {
          cursor: data.next_cursor,
          hasMore: data.has_more,
          limit: pagination.limit,
        },
        totalCount: data.total_count,
        cache: newCache,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchRandomQuestion: async (companyId) => {
    set({ isLoading: true, error: null });

    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.timeframe) params.append('timeframe', filters.timeframe);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.topics.length > 0) params.append('topics', filters.topics.join(','));
      if (filters.patterns.length > 0) params.append('patterns', filters.patterns.join(','));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/companies/${companyId}/questions/random?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch random question');
      }

      const data = await response.json();
      set({ isLoading: false, error: null });
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateQuestionSolveStatus: (questionId, solved) => {
    const questions = get().questions.map((q) =>
      q.id === questionId ? { ...q, solved } : q
    );
    set({ questions });
  },

  invalidateCache: () => {
    set({ cache: new Map() });
  },

  clearError: () => set({ error: null }),
}));

export default useQuestionStore;
