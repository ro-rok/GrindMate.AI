import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import useQuestionStore from '../store/questionStore';
import useAuthStore from '../store/authStore';
import QuestionFilters from '../components/question/QuestionFilters';
import QuestionCard from '../components/question/QuestionCard';
import QuestionActionModal from '../components/question/QuestionActionModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoaderTerminal from '../components/LoaderTerminal';
import { useReducedMotion } from '../hooks/useReducedMotion';
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

  // Fetch company details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await api.get(`/companies/${companyId}`);
        setCompany(response.data);
      } catch (err) {
        console.error('Failed to fetch company:', err);
        setError('Failed to load company details');
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
    try {
      await api.post(`/companies/${companyId}/refresh`);
      toast.success('Import started! Refreshing questions...', {
        style: {
          background: '#fde68a',
          color: '#92400e',
          fontWeight: 'bold',
        },
      });

      // Wait for job to complete
      setTimeout(async () => {
        await fetchQuestions();
        toast.success('Questions refreshed!', {
          style: {
            background: '#fde68a',
            color: '#92400e',
            fontWeight: 'bold',
          },
        });
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
      toast('Sign up to solve questions and track progress!', {
        icon: '🔒',
      });
      navigate('/login');
      return;
    }
    
    // Open LeetCode link
    window.open(question.link, '_blank');
    
    // Show action modal to ask what user wants to do
    setActionModalQuestion(question);
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
        navigate(`/focus/${actionModalQuestion.id}`);
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
      toast('Sign up to track progress!', { icon: '🔒' });
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

      toast.success('Progress reset! Refreshing questions...', {
        style: {
          background: '#fde68a',
          color: '#92400e',
          fontWeight: 'bold',
        },
      });

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
    return <LoaderTerminal />;
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-black-base flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Failed to Load Company
          </h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
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
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => navigate('/companies')}
                className="text-text-tertiary hover:text-text-primary transition-colors mb-2"
              >
                ← Back to Companies
              </button>
              <h1 className="text-4xl font-bold text-text-primary">
                {company?.name || 'Company Questions'}
              </h1>
            </div>
            
            {/* Populate Button */}
            <Button
              variant="warning"
              onClick={handlePopulate}
              disabled={isPopulating}
              className="font-bold"
            >
              {isPopulating ? 'Populating...' : 'Populate'}
            </Button>
          </div>
        </motion.div>

        {/* Timeframe Tabs */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2">
            {['30_days', '90_days', 'more_than_six_months', 'all_time'].map((timeframe) => {
              const labels = {
                '30_days': '30 Days',
                '90_days': '3 Months',
                'more_than_six_months': '6+ Months',
                'all_time': 'All Time',
              };
              
              return (
                <Button
                  key={timeframe}
                  variant={filters.timeframe === timeframe ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleFilterChange({ ...filters, timeframe })}
                >
                  {labels[timeframe]}
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* Update Month Filters */}
        {updateMonths.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-text-tertiary text-sm font-medium">Last Updated:</span>
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
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <QuestionFilters
            filters={filters}
            onChange={handleFilterChange}
            questionCount={displayedQuestions.length}
            availableTopics={availableTopics}
          />
        </motion.div>

        {/* Random Question Card */}
        {randomQuestion && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6"
          >
            <Card className="p-6 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border-accent-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    🎲 Random Question
                  </h3>
                  <p className="text-lg text-text-secondary">{randomQuestion.title}</p>
                </div>
                <button
                  onClick={() => setRandomQuestion(null)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleQuestionClick(randomQuestion)}
                >
                  Solve
                </Button>
                {randomQuestion.solved && (
                  <Button
                    variant="secondary"
                    onClick={() => handleMarkSolved(randomQuestion.id, false)}
                  >
                    Mark Unsolved
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Bar */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleGetRandom}>
              🎲 Random Question
            </Button>
          </div>

          {isAuthenticated && displayedQuestions.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-text-secondary text-sm">
                Solved <span className="font-semibold text-accent-success">{solvedCount}</span> out of{' '}
                <span className="font-semibold text-accent-primary">{displayedQuestions.length}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetProgress}
                className="text-accent-danger hover:text-accent-danger"
              >
                Reset Progress
              </Button>
            </div>
          )}
        </motion.div>

        {/* Guest notice */}
        {!isAuthenticated && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <p className="text-blue-400 mb-2">
              Sign up to track your progress and unlock personalized features!
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
            <LoaderTerminal />
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
            <h3 className="text-2xl font-semibold text-text-primary mb-2">
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

        {/* Questions grid */}
        {!isLoading && displayedQuestions.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
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
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default QuestionList;
