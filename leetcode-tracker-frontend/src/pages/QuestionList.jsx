import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from '../utils/toast';
import useQuestionStore from '../store/questionStore';
import useAuthStore from '../store/authStore';
import QuestionFilters from '../components/question/QuestionFilters';
import QuestionCard from '../components/question/QuestionCard';
import QuestionRow from '../components/question/QuestionRow';
import QuestionListView from '../components/question/QuestionListView';
import QuestionActionModal from '../components/question/QuestionActionModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getQuestionIdentifier, getCompanyIdentifier } from '../utils/slugify';
import api from '../api';

/**
 * Question list page with comprehensive features:
 * - Populate button to refresh questions from LeetCode
 * - Update month filters (Latest, Jan 25, Dec 24, etc.)
 * - Random question feature
 * - Solve/Unsolve functionality
 * - Reset progress for company
 * - Filter by timeframe, difficulty, topics
 * - Search and sort
 */
function QuestionList() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { isAuthenticated, user } = useAuthStore();
  const prevLocationRef = useRef(location.pathname);
  
  const { filters, setFilters } = useQuestionStore();

  const [company, setCompany] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [displayedQuestions, setDisplayedQuestions] = useState([]);
  const [updateMonths, setUpdateMonths] = useState([]);
  const [activeMonth, setActiveMonth] = useState(null);
  const [randomQuestion, setRandomQuestion] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [error, setError] = useState(null);
  const [actionModalQuestion, setActionModalQuestion] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const fetchedCompaniesRef = useRef(new Set());
  const fetchingQuestionsRef = useRef(false);
  const lastFetchParamsRef = useRef(null);
  const markingSolvedRef = useRef(new Set()); // Track in-flight solve/unsolve operations
  const resettingProgressRef = useRef(false); // Track in-flight reset progress operation
  
  // Fetch company details
  useEffect(() => {
    // Prevent double calls in React StrictMode - use Set to track fetched companyIds
    if (!companyId || fetchedCompaniesRef.current.has(companyId)) return;
    fetchedCompaniesRef.current.add(companyId);

    const fetchCompany = async () => {
      try {
        const response = await api.get(`/companies/${companyId}`);
        setCompany(response.data);
        setError(null); // Clear any previous errors
      } catch (err) {
        
        // Provide specific error messages based on status code
        if (err.response?.status === 404) {
          setError(`Company "${companyId}" not found. It may have been removed or the ID is incorrect.`);
        } else if (err.response?.status === 401) {
          setError('Authentication required to view this company.');
        } else if (err.response?.status === 400) {
          setError(`Invalid company ID format: "${companyId}"`);
        } else {
          setError('Failed to load company details. Please try again later.');
        }
      }
      // Don't remove from Set - prevents double calls even in StrictMode
    };

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  // Fetch questions
  const fetchQuestions = async (forceRefresh = false) => {
    if (!companyId) return;

    const params = {
      timeframe: filters.timeframe,
      difficulty: filters.difficulty || '',
      topics: filters.topics.join(','),
      user_id: user?.id || '',
    };
    
    // Debug: Log user_id to help diagnose solved status issues
    if (process.env.NODE_ENV === 'development') {
      console.log('[QuestionList] Fetching questions with user_id:', params.user_id, 'isAuthenticated:', isAuthenticated);
    }

    // Prevent duplicate calls unless forced refresh
    const paramsKey = JSON.stringify(params);
    if (!forceRefresh && fetchingQuestionsRef.current && lastFetchParamsRef.current === paramsKey) {
      return;
    }

    fetchingQuestionsRef.current = true;
    lastFetchParamsRef.current = paramsKey;
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/companies/${companyId}/questions.json`, { params });
      const data = response.data;

      const solvedCount = data.filter(q => q.solved).length;

      // Hydrate data - extract update months from the current timeframe
      setAllQuestions(data);
      
      if (data.length > 0) {
        const months = Array.from(new Set(
          data.map(q => format(new Date(q.updated_at), 'MMM yy'))
        )).sort((a, b) => {
          // Parse month strings like "Jan 26" back to dates for proper sorting
          // Format: "MMM yy" -> "Jan 26" means January 2026
          const parseMonthYear = (str) => {
            const [month, year] = str.split(' ');
            // Convert 2-digit year to 4-digit (26 -> 2026, 24 -> 2024)
            const fullYear = parseInt(year) + 2000;
            return new Date(`${month} 1, ${fullYear}`);
          };
          
          const dateA = parseMonthYear(a);
          const dateB = parseMonthYear(b);
          
          // Sort descending (most recent first)
          return dateB.getTime() - dateA.getTime();
        });
        
        setUpdateMonths(months);
        // Set "Latest" as default (most recent month - first in sorted array)
        setActiveMonth(months[0]);
      } else {
        setUpdateMonths([]);
        setActiveMonth(null);
      }

      if (data.length === 0) {
        toast('No questions found. Try populating or switching filters.', {
          icon: '🔍',
          duration: 3000,
        });
      }
    } catch (err) {
      setError('Failed to load questions');
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
      fetchingQuestionsRef.current = false; // Reset fetching flag after completion
    }
  };

  // Fetch questions when filters change
  useEffect(() => {
    if (companyId) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, filters.timeframe, filters.difficulty, JSON.stringify(filters.topics)]);

  // Refresh questions when navigating back from FocusMode
  useEffect(() => {
    // Check if we came from FocusMode (supports both old /focus/ and new /companies/.../focus/ formats)
    const wasOnFocusPage = prevLocationRef.current?.includes('/focus/');
    const isNowOnCompanyPage = location.pathname.includes(`/companies/${companyId}`);
    const questionSolved = location.state?.questionSolved;
    const solvedQuestionId = location.state?.questionId; // DB ID
    const solvedQuestionSlug = location.state?.questionSlug; // Slug/identifier
    
    // If we navigated from FocusMode back to this company page, refresh questions
    // Also check for the questionSolved flag passed from FocusMode
    if ((wasOnFocusPage && isNowOnCompanyPage) || questionSolved) {
      if (companyId && isAuthenticated) {
        // CRITICAL: Always fetch fresh solved status from backend
        // Don't use optimistic updates - backend is single source of truth
        fetchQuestions(true); // Force refresh to get latest solved status from backend
      }
    }
    
    prevLocationRef.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state, companyId, isAuthenticated]);

  // Refresh questions when page becomes visible or focused (e.g., returning from FocusMode)
  // Disabled to prevent duplicate calls - navigation detection handles refresh
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && companyId && isAuthenticated) {
  //       // Refresh questions when page becomes visible
  //       fetchQuestions();
  //     }
  //   };

  //   const handleFocus = () => {
  //     if (companyId && isAuthenticated) {
  //       // Refresh questions when window regains focus
  //       fetchQuestions();
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   window.addEventListener('focus', handleFocus);
    
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     window.removeEventListener('focus', handleFocus);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [companyId, isAuthenticated]);

  // Filter questions by active month and search term
  useEffect(() => {
    if (allQuestions.length === 0) {
      setDisplayedQuestions([]);
      return;
    }
    
    let filtered = [...allQuestions];
    
    // Filter by active month if selected
    if (activeMonth) {
      filtered = filtered.filter(q => format(new Date(q.updated_at), 'MMM yy') === activeMonth);
    }
    
    // Filter by search term if provided
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(q => {
        // Search in title, topics, and difficulty
        const titleMatch = q.title?.toLowerCase().includes(searchLower);
        const topicsMatch = q.topics?.toLowerCase().includes(searchLower);
        const difficultyMatch = q.difficulty?.toLowerCase().includes(searchLower);
        const idMatch = q.id?.toString().toLowerCase().includes(searchLower);
        const numberMatch = q.number?.toString().includes(searchLower);
        
        return titleMatch || topicsMatch || difficultyMatch || idMatch || numberMatch;
      });
    }
    
    // Sort by frequency
    filtered.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    setDisplayedQuestions(filtered);
  }, [allQuestions, activeMonth, filters.search]);

  // Fetch available topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await api.get(`/companies/${companyId}/topics`);
        setAvailableTopics(response.data);
      } catch (err) {
        // Extract topics from questions if endpoint doesn't exist
        if (allQuestions.length > 0) {
          const topicsSet = new Set();
          allQuestions.forEach(q => {
            if (q.topics) {
              q.topics.split(',').forEach(topic => topicsSet.add(topic.trim()));
            }
          });
          setAvailableTopics(Array.from(topicsSet).sort());
        }
      }
    };

    if (companyId && allQuestions.length > 0) {
      fetchTopics();
    }
  }, [companyId, allQuestions]);

  // Handle populate
  const handlePopulate = async () => {
    // Prevent duplicate calls (idempotency guard)
    if (isPopulating) return;
    
    if (!isAuthenticated) {
      toast('Sign up to populate questions!', { icon: '🔒' });
      navigate('/login');
      return;
    }

    setIsPopulating(true);
    toast.info('Populating questions... This may take a moment.', { duration: 3000 });
    try {
      await api.post(`/companies/${companyId}/refresh`);
      toast.success('Import started! Refreshing questions...');

      // Wait for job to complete
      setTimeout(async () => {
        await fetchQuestions();
        toast.success('Questions refreshed!');
      }, 3000);
    } catch (err) {
      console.error('Failed to populate:', err);
      if (err.response?.status === 403) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error('Import failed. Please try again later.');
      }
    } finally {
      setIsPopulating(false);
    }
  };

  // Handle random question
  const handleGetRandom = async () => {
    if (!companyId) return;

    try {
      const params = {
        timeframe: filters.timeframe,
        difficulty: filters.difficulty || '',
        topics: filters.topics.join(','),
        user_id: user?.id || '',
        update: activeMonth || '',
      };

      const response = await api.get(`/companies/${companyId}/questions/random.json`, { params });
      setRandomQuestion(response.data);
    } catch (err) {
      toast.error('Failed to get random question');
    }
  };

  // Handle question click
  const handleQuestionClick = (question) => {
    if (!isAuthenticated) {
      toast.info('Sign up to solve questions and track progress!');
      navigate('/login');
      return;
    }
    
    // Open LeetCode in new tab if URL exists
    const leetcodeUrl = question.leetcode_url || question.link;
    if (leetcodeUrl) {
      window.open(leetcodeUrl, '_blank');
    }
    
    // Navigate to Focus Mode with company-slug/question-slug format
    // CRITICAL: Pass question.id (ObjectId) in state to ensure exact question matching
    // The URL uses slugs for readability, but state contains the exact ID from QuestionList
    const companySlug = company ? getCompanyIdentifier(company) : companyId;
    const questionSlug = getQuestionIdentifier(question);
    navigate(`/companies/${companySlug}/focus/${questionSlug}`, {
      state: { 
        returnTo: `/companies/${companyId}`,
        questionId: question.id, // Pass exact ObjectId to ensure correct question is loaded
        questionSlug: questionSlug, // Also pass slug for reference
        companyId: companyId // Pass company ID for reference
      }
    });
  };

  // Handle action from modal
  const handleQuestionAction = async (action) => {
    if (!actionModalQuestion) return;

    switch (action) {
      case 'solved':
        await handleMarkSolved(actionModalQuestion.id, true);
        break;
      
      case 'stuck':
        // Navigate to focus mode with AI tutor
        // CRITICAL: Pass question.id (ObjectId) in state to ensure exact question matching
        const companySlugStuck = company ? getCompanyIdentifier(company) : companyId;
        const questionSlugStuck = getQuestionIdentifier(actionModalQuestion);
        navigate(`/companies/${companySlugStuck}/focus/${questionSlugStuck}`, {
          state: { 
            returnTo: `/companies/${companyId}`,
            questionId: actionModalQuestion.id, // Pass exact ObjectId to ensure correct question is loaded
            questionSlug: questionSlugStuck, // Also pass slug for reference
            companyId: companyId // Pass company ID for reference
          }
        });
        break;
      
      case 'unsolve':
        await handleMarkSolved(actionModalQuestion.id, false);
        break;
      
      case 'opened':
      default:
        // Just close the modal, no action
        break;
    }
  };

  // Handle mark solved/unsolved
  // CRITICAL: questionId parameter must be question.id (database ObjectId), not a slug
  // This ensures consistency with backend queries and other solve/unsolve operations
  const handleMarkSolved = async (questionId, solved) => {
    if (!isAuthenticated) return;
    
    // Validate questionId is provided
    if (!questionId) {
      toast.error('Question identifier not available');
      console.error('[QuestionList] Cannot mark solved/unsolved: missing questionId');
      return;
    }

    // Idempotency guard: prevent duplicate calls for the same question/action
    const operationKey = `${questionId}-${solved ? 'solve' : 'unsolve'}`;
    if (markingSolvedRef.current.has(operationKey)) {
      return; // Already processing this operation
    }

    markingSolvedRef.current.add(operationKey);

    try {
      // CRITICAL: Always use question.id (ObjectId) for API calls
      // Always include user_id parameter for authentication
      if (solved) {
        await api.post(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      } else {
        await api.delete(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      }

      // CRITICAL: Always fetch fresh solved status from backend after marking solved/unsolved
      // Don't use optimistic updates - backend is single source of truth
      await fetchQuestions(true); // Force refresh to get latest solved status from backend

      toast.success(solved ? 'Marked as solved!' : 'Marked as unsolved');
    } catch (err) {
      toast.error('Failed to update solve status');
      // On error, refresh from backend to ensure we have correct state
      await fetchQuestions(true);
    } finally {
      // Remove from tracking set after completion
      markingSolvedRef.current.delete(operationKey);
    }
  };

  // Handle reset progress
  const handleResetProgress = async () => {
    if (!isAuthenticated) {
      toast.info('Sign up to track progress!');
      navigate('/login');
      return;
    }

    // Idempotency guard: prevent duplicate calls
    if (resettingProgressRef.current) {
      return;
    }

    if (!confirm('Reset all progress for this company? This cannot be undone.')) {
      return;
    }

    resettingProgressRef.current = true;

    try {
      await api.post('/users/reset_progress.json', {
        company_id: companyId,
        user_id: user.id,
      });

      toast.success('Progress reset! Refreshing questions...');

      await fetchQuestions();
    } catch (err) {
      toast.error('Failed to reset progress');
    } finally {
      resettingProgressRef.current = false;
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  if (!company && !error) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-[var(--space-8)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-[var(--space-8)]">
        <Card className="p-8 text-center max-w-2xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Company Not Found
            </h2>
            <p className="text-[var(--text-secondary)] mb-2">{error}</p>
            {companyId && (
              <p className="text-sm text-[var(--text-tertiary)] mt-2 font-mono">
                {companyId}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={() => navigate('/companies')}>
              Browse Companies
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const solvedCount = displayedQuestions.filter(q => q.solved).length;

  return (
    <div className="min-h-screen bg-black-base overflow-x-hidden w-full">
      {/* Question Action Modal */}
      <QuestionActionModal
        question={actionModalQuestion}
        isOpen={!!actionModalQuestion}
        onClose={() => setActionModalQuestion(null)}
        onAction={handleQuestionAction}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 w-full overflow-x-hidden">
        {/* Compact Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3 sm:mb-4"
        >
          <button
            onClick={() => navigate('/companies')}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-2 text-xs sm:text-sm block"
          >
            ← Back to Companies
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
              {/* Company Name */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                  {company?.name || company?.id || 'Company Questions'}
                </h1>
                {company?.question_count !== undefined && (
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {company.question_count} questions
                  </span>
                )}
              </div>

              {/* Updated Section - Scrollable on mobile */}
              {updateMonths.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[var(--text-tertiary)] text-xs font-medium flex-shrink-0">Updated:</span>
                  <div className="flex items-center gap-2 overflow-x-auto flex-1 sm:flex-initial pb-1 sm:pb-0 scrollbar-thin">
                    {updateMonths.map((month, index) => (
                      <Button
                        key={month}
                        variant={activeMonth === month ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setActiveMonth(month)}
                        className="text-xs flex-shrink-0"
                      >
                        {index === 0 ? 'Latest' : month}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Populate Button - Right Aligned */}
            <Button
              variant="warning"
              size="sm"
              onClick={handlePopulate}
              disabled={isPopulating}
              className="font-semibold w-full sm:w-auto"
            >
              {isPopulating ? 'Populating...' : 'Populate'}
            </Button>
          </div>
        </motion.div>

        {/* Sticky Filter Bar */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="sticky top-0 z-10 bg-[var(--bg-base)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)] py-2 sm:py-3 mb-3 sm:mb-4"
        >
          {/* Compact Filter Row - Left Aligned */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Filters - Left Aligned */}
            <div className="flex-1 min-w-0">
              <QuestionFilters
                filters={filters}
                onChange={handleFilterChange}
                questionCount={displayedQuestions.length}
                availableTopics={availableTopics}
              />
            </div>
            
            {/* Random Question Button */}
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleGetRandom}
                className="font-semibold w-full sm:w-auto"
              >
                🎲 Random Question
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Random Question Card */}
        {randomQuestion && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-3 sm:mb-4"
          >
            <Card className="p-3 sm:p-4 bg-gradient-to-r from-[var(--accent-primary-light)] to-[var(--accent-secondary)]/10 border-[var(--border-brand)]">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-1 sm:mb-2">
                    🎲 Random Question
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] break-words mb-2">{randomQuestion.title}</p>
                  
                  {/* Question metadata */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Difficulty */}
                    <Badge 
                      variant={Badge.getDifficultyVariant(randomQuestion.difficulty)} 
                      size="sm"
                    >
                      {randomQuestion.difficulty || 'Medium'}
                    </Badge>
                    
                    {/* Topics */}
                    {randomQuestion.topics && randomQuestion.topics.split(',').slice(0, 3).map((topic, idx) => (
                      <Badge key={idx} variant="default" size="sm">
                        {topic.trim()}
                      </Badge>
                    ))}
                    
                    {/* Acceptance Rate */}
                    {randomQuestion.acceptance_rate && (
                      <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-tertiary)] uppercase">AC</span>
                        <span className="font-semibold">{Math.round(randomQuestion.acceptance_rate * 100)}%</span>
                      </div>
                    )}
                    
                    {/* Frequency */}
                    {randomQuestion.frequency > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-tertiary)] uppercase">Freq</span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[var(--accent-primary)] rounded-full"
                              style={{ width: `${Math.min((randomQuestion.frequency / 100) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-medium">{randomQuestion.frequency}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setRandomQuestion(null)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-2)] self-start sm:self-auto"
                  aria-label="Close random question"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleQuestionClick(randomQuestion)}
                  className="w-full sm:w-auto"
                >
                  Solve
                </Button>
                {randomQuestion.solved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMarkSolved(randomQuestion.id, false)}
                    className="w-full sm:w-auto"
                  >
                    Mark Unsolved
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Bar - Compact */}
        {isAuthenticated && displayedQuestions.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6"
          >
            <div className="text-[var(--text-secondary)] text-xs sm:text-sm">
              Solved <span className="font-semibold text-[var(--accent-success)]">{solvedCount}</span> out of{' '}
              <span className="font-semibold text-[var(--accent-primary)]">{displayedQuestions.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetProgress}
              className="text-[var(--accent-danger)] hover:text-[var(--accent-danger-hover)] w-full sm:w-auto"
            >
              Reset Progress
            </Button>
          </motion.div>
        )}

        {/* Guest notice */}
        {!isAuthenticated && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-3 sm:mb-4 p-3 bg-[var(--accent-primary-light)] border border-[var(--border-brand)] rounded-[var(--radius-md)]"
          >
            <p className="text-[var(--accent-primary)] text-xs sm:text-sm mb-2">
              💡 Sign up to track your progress and unlock personalized features!
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto"
            >
              Sign Up / Login
            </Button>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayedQuestions.length === 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-[var(--space-2)]">
              No Questions Found
            </h3>
            <p className="text-text-secondary mb-6">
              Try populating questions or adjusting your filters
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={handlePopulate}>
                Populate Questions
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleFilterChange({
                  ...filters,
                  difficulty: null,
                  topics: [],
                })}
              >
                Clear Filters
              </Button>
            </div>
          </motion.div>
        )}

        {/* View Toggle */}
        {!isLoading && displayedQuestions.length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-0.5 sm:p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)] ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent-primary)] text-white shadow-[var(--elevation-1)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
                }`}
                aria-label="List view"
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)] ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent-primary)] text-white shadow-[var(--elevation-1)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
                }`}
                aria-label="Grid view"
              >
                Grid
              </button>
            </div>
          </div>
        )}

        {/* Questions List/Grid */}
        {!isLoading && displayedQuestions.length > 0 && (
          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div
                key="list"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <QuestionListView
                  questions={displayedQuestions}
                  onQuestionClick={handleQuestionClick}
                  onStart={(question) => {
                    // Open LeetCode in new tab if URL exists
                    if (question.leetcode_url) {
                      window.open(question.leetcode_url, '_blank');
                    }
                    // Navigate to Focus Mode with company-slug/question-slug format
                    // CRITICAL: Pass question.id (ObjectId) in state to ensure exact question matching
                    const companySlugStart = company ? getCompanyIdentifier(company) : companyId;
                    const questionSlugStart = getQuestionIdentifier(question);
                    navigate(`/companies/${companySlugStart}/focus/${questionSlugStart}`, {
                      state: { 
                        returnTo: `/companies/${companyId}`,
                        questionId: question.id, // Pass exact ObjectId to ensure correct question is loaded
                        questionSlug: questionSlugStart, // Also pass slug for reference
                        companyId: companyId // Pass company ID for reference
                      }
                    });
                  }}
                  onAskAI={(question) => {
                    // Navigate to Focus Mode with company-slug/question-slug format
                    // CRITICAL: Pass question.id (ObjectId) in state to ensure exact question matching
                    const companySlugAI = company ? getCompanyIdentifier(company) : companyId;
                    const questionSlugAI = getQuestionIdentifier(question);
                    navigate(`/companies/${companySlugAI}/focus/${questionSlugAI}`, {
                      state: { 
                        returnTo: `/companies/${companyId}`,
                        questionId: question.id, // Pass exact ObjectId to ensure correct question is loaded
                        questionSlug: questionSlugAI, // Also pass slug for reference
                        companyId: companyId // Pass company ID for reference
                      }
                    });
                    // Focus mode will open AI tutor tab
                  }}
                  onMarkSolved={(question, solved) => handleMarkSolved(question.id, solved)}
                  onStar={() => {}}
                  onOpenLeetCode={(question) => {
                    if (question.leetcode_url) {
                      window.open(question.leetcode_url, '_blank');
                    }
                  }}
                  isLoading={false}
                />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
              >
                {displayedQuestions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    layout
                  >
                    <QuestionCard
                      question={question}
                      solved={question.solved}
                      onClick={() => handleQuestionClick(question)}
                      layoutId={`question-${question.id}`}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default QuestionList;
