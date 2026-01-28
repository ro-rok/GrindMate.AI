import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getQuestionIdentifier } from '../utils/slugify';
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
  const prefersReducedMotion = useReducedMotion();
  const { isAuthenticated, user } = useAuthStore();
  
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

  // Fetch company details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await api.get(`/companies/${companyId}`);
        console.log('Company data received:', response.data);
        setCompany(response.data);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Failed to fetch company:', err);
        
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
    };

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  // Fetch questions
  const fetchQuestions = async () => {
    if (!companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        timeframe: filters.timeframe,
        difficulty: filters.difficulty || '',
        topics: filters.topics.join(','),
        user_id: user?.id || '',
      };

      const response = await api.get(`/companies/${companyId}/questions.json`, { params });
      const data = response.data;

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
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch questions when filters change
  useEffect(() => {
    if (companyId) {
      fetchQuestions();
    }
  }, [companyId, filters.timeframe, filters.difficulty, filters.topics]);

  // Filter questions by active month
  useEffect(() => {
    if (!activeMonth || allQuestions.length === 0) {
      setDisplayedQuestions([]);
      return;
    }
    
    // Filter questions by the selected update month
    // This shows which questions were updated/imported in that specific populate run
    const filtered = allQuestions
      .filter(q => format(new Date(q.updated_at), 'MMM yy') === activeMonth)
      .sort((a, b) => b.frequency - a.frequency);
    
    setDisplayedQuestions(filtered);
  }, [allQuestions, activeMonth]);

  // Fetch available topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await api.get(`/companies/${companyId}/topics`);
        setAvailableTopics(response.data);
      } catch (err) {
        console.error('Failed to fetch topics:', err);
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
      console.error('Failed to get random question:', err);
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
    
    // Navigate to Focus Mode
    navigate(`/focus/${getQuestionIdentifier(question)}`);
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
        navigate(`/focus/${getQuestionIdentifier(actionModalQuestion)}`);
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
  const handleMarkSolved = async (questionId, solved) => {
    if (!isAuthenticated) return;

    try {
      if (solved) {
        await api.post(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      } else {
        await api.delete(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      }

      // Update local state
      setAllQuestions(questions =>
        questions.map(q => q.id === questionId ? { ...q, solved } : q)
      );

      if (randomQuestion?.id === questionId) {
        setRandomQuestion(q => q ? { ...q, solved } : null);
      }

      toast.success(solved ? 'Marked as solved!' : 'Marked as unsolved');
    } catch (err) {
      console.error('Failed to update solve status:', err);
      toast.error('Failed to update solve status');
    }
  };

  // Handle reset progress
  const handleResetProgress = async () => {
    if (!isAuthenticated) {
      toast.info('Sign up to track progress!');
      navigate('/login');
      return;
    }

    if (!confirm('Reset all progress for this company? This cannot be undone.')) {
      return;
    }

    try {
      await api.post('/users/reset_progress.json', {
        company_id: companyId,
        user_id: user.id,
      });

      toast.success('Progress reset! Refreshing questions...');

      await fetchQuestions();
    } catch (err) {
      console.error('Failed to reset progress:', err);
      toast.error('Failed to reset progress');
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
    <div className="min-h-screen bg-black-base">
      {/* Question Action Modal */}
      <QuestionActionModal
        question={actionModalQuestion}
        isOpen={!!actionModalQuestion}
        onClose={() => setActionModalQuestion(null)}
        onAction={handleQuestionAction}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compact Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-[var(--space-4)]"
        >
          <button
            onClick={() => navigate('/companies')}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-[var(--space-2)] text-sm block"
          >
            ← Back to Companies
          </button>
          
          <div className="flex items-center justify-between gap-[var(--space-4)] flex-wrap">
            <div className="flex items-center gap-[var(--space-4)] flex-wrap">
              {/* Company Name */}
              <div className="flex items-center gap-[var(--space-3)]">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {company?.name || company?.id || 'Company Questions'}
                </h1>
                {company?.question_count !== undefined && (
                  <span className="text-sm text-[var(--text-secondary)]">
                    {company.question_count} questions
                  </span>
                )}
              </div>

              {/* Updated Section */}
              {updateMonths.length > 0 && (
                <div className="flex items-center gap-[var(--space-2)]">
                  <span className="text-[var(--text-tertiary)] text-xs font-medium">Updated:</span>
                  {updateMonths.map((month, index) => (
                    <Button
                      key={month}
                      variant={activeMonth === month ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setActiveMonth(month)}
                    >
                      {index === 0 ? 'Latest' : month}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Populate Button - Right Aligned */}
            <Button
              variant="warning"
              size="md"
              onClick={handlePopulate}
              disabled={isPopulating}
              className="font-semibold"
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
          className="sticky top-0 z-10 bg-[var(--bg-base)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)] py-[var(--space-3)] mb-[var(--space-4)]"
        >
          {/* Compact Filter Row - Left Aligned */}
          <div className="flex items-center gap-[var(--space-4)] flex-wrap">
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
                className="font-semibold"
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
            className="mb-[var(--space-4)]"
          >
            <Card className="p-[var(--space-4)] bg-gradient-to-r from-[var(--accent-primary-light)] to-[var(--accent-secondary)]/10 border-[var(--border-brand)]">
              <div className="flex items-start justify-between mb-[var(--space-3)]">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-[var(--space-1)]">
                    🎲 Random Question
                  </h3>
                  <p className="text-base text-[var(--text-secondary)]">{randomQuestion.title}</p>
                </div>
                <button
                  onClick={() => setRandomQuestion(null)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-[var(--space-1)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-2)]"
                  aria-label="Close random question"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-[var(--space-2)]">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleQuestionClick(randomQuestion)}
                >
                  Solve
                </Button>
                {randomQuestion.solved && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMarkSolved(randomQuestion.id, false)}
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
            className="flex items-center justify-between mb-6"
          >
            <div className="text-[var(--text-secondary)] text-sm">
              Solved <span className="font-semibold text-[var(--accent-success)]">{solvedCount}</span> out of{' '}
              <span className="font-semibold text-[var(--accent-primary)]">{displayedQuestions.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetProgress}
              className="text-[var(--accent-danger)] hover:text-[var(--accent-danger-hover)]"
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
            className="mb-[var(--space-4)] p-[var(--space-3)] bg-[var(--accent-primary-light)] border border-[var(--border-brand)] rounded-[var(--radius-md)]"
          >
            <p className="text-[var(--accent-primary)] text-sm mb-[var(--space-2)]">
              💡 Sign up to track your progress and unlock personalized features!
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
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
          <div className="flex items-center justify-end gap-2 mb-4">
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)] ${
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
                className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)] ${
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
                    // Navigate to Focus Mode
                    navigate(`/focus/${getQuestionIdentifier(question)}`);
                  }}
                  onAskAI={(question) => {
                    navigate(`/focus/${getQuestionIdentifier(question)}`);
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
