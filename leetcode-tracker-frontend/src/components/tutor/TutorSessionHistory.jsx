import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getQuestionIdentifier } from '../../utils/slugify';

/**
 * TutorSessionHistory Component
 * Displays recent AI tutor sessions with insights and recommendations
 * 
 * Requirements: 7.2, 7.3, 7.4
 * 
 * Features:
 * - Fetch and display last 20 tutor sessions
 * - Show question title, date, mode, hints count, solved status, time spent
 * - Display AI-generated insights (summary, weaknesses, mistakes)
 * - Show recommendations (3 topics + 5 questions)
 * - Loading skeleton and error states
 * - Retry functionality on error
 */
const TutorSessionHistory = ({ userId }) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call /api/tutor/sessions endpoint (Requirement 7.2)
      const response = await api.get('/tutor/sessions', {
        params: { limit: 20 }
      });

      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch tutor sessions:', err);
      setError(err.response?.data?.error_message || 'Failed to load tutor sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchSessions();
  };

  const handleQuestionClick = (question) => {
    navigate(`/focus/${getQuestionIdentifier(question)}`);
  };

  const toggleSessionExpansion = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeSpent = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HARD':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getTutorModeLabel = (mode) => {
    switch (mode) {
      case 'socratic':
        return 'Socratic';
      case 'eli5':
        return 'ELI5';
      case 'interview':
        return 'Interview';
      default:
        return mode;
    }
  };

  // Loading state with skeleton loader (Requirement 7.2)
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="mb-6">
          <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-48" />
          <div className="h-4 bg-gray-800 rounded animate-pulse w-64" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-black-base rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-800 rounded animate-pulse mb-2 w-3/4" />
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-6 bg-gray-800 rounded animate-pulse w-16" />
              </div>
              <div className="flex gap-2 mb-3">
                <div className="h-6 bg-gray-800 rounded animate-pulse w-20" />
                <div className="h-6 bg-gray-800 rounded animate-pulse w-24" />
                <div className="h-6 bg-gray-800 rounded animate-pulse w-16" />
              </div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Error state with retry button (Requirement 7.2)
  if (error) {
    return (
      <Card className="p-6">
        <ErrorState
          title="Failed to Load Sessions"
          message={error}
          onRetry={handleRetry}
          retryLabel="Try Again"
        />
      </Card>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="mb-4 text-6xl">🎓</div>
          <h3 className="text-xl font-semibold text-gray-50 mb-2">
            No Tutor Sessions Yet
          </h3>
          <p className="text-gray-400 mb-6">
            Start using the AI tutor in Focus Mode to see your session history here
          </p>
          <Button onClick={() => navigate('/questions')}>
            Browse Questions
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-50 mb-2">
            AI Tutor Session History
          </h2>
          <p className="text-gray-400">
            Review your recent tutoring sessions and track your learning progress
          </p>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <motion.div
              key={session.session_id}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 bg-black-base rounded-lg border border-border-subtle hover:border-accent-primary/30 transition-colors"
            >
              {/* Session Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {/* Question Title (Requirement 7.2) */}
                  <button
                    onClick={() => handleQuestionClick(session.question_id)}
                    className="text-lg font-medium text-gray-50 hover:text-accent-primary transition-colors text-left"
                  >
                    {session.question_title}
                  </button>
                  {/* Date (Requirement 7.2) */}
                  <p className="text-sm text-gray-400 mt-1">
                    {formatDate(session.date)}
                  </p>
                </div>
                {/* Solved Status (Requirement 7.2) */}
                {session.solved && (
                  <Badge variant="success">✓ Solved</Badge>
                )}
              </div>

              {/* Session Metadata */}
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Difficulty (Requirement 7.2) */}
                <Badge variant={getDifficultyColor(session.question_difficulty)}>
                  {session.question_difficulty}
                </Badge>
                {/* Tutor Mode (Requirement 7.2) */}
                <Badge variant="default">
                  {getTutorModeLabel(session.tutor_mode)}
                </Badge>
                {/* Hints Count (Requirement 7.2) */}
                <Badge variant="default">
                  💡 {session.hints_used} {session.hints_used === 1 ? 'hint' : 'hints'}
                </Badge>
                {/* Time Spent (Requirement 7.2) */}
                <Badge variant="default">
                  ⏱️ {formatTimeSpent(session.time_spent_seconds)}
                </Badge>
              </div>

              {/* AI Summary (Requirement 7.3) */}
              {session.ai_summary && (
                <div className="mb-3 p-3 bg-black-elevated rounded-lg border border-border-subtle">
                  <p className="text-sm text-gray-300">
                    {session.ai_summary}
                  </p>
                </div>
              )}

              {/* Expandable Insights Section */}
              {(session.weaknesses_detected?.length > 0 ||
                session.recurring_mistakes?.length > 0 ||
                session.recommended_topics?.length > 0 ||
                session.recommended_questions?.length > 0) && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleSessionExpansion(session.session_id)}
                    className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors flex items-center gap-1"
                  >
                    {expandedSession === session.session_id ? '▼' : '▶'}
                    {expandedSession === session.session_id ? 'Hide' : 'Show'} Insights & Recommendations
                  </button>

                  {expandedSession === session.session_id && (
                    <motion.div
                      initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 space-y-4"
                    >
                      {/* Weaknesses Detected (Requirement 7.3) */}
                      {session.weaknesses_detected?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-50 mb-2">
                            Weaknesses Detected
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {session.weaknesses_detected.map((weakness, idx) => (
                              <Badge key={idx} variant="warning">
                                {weakness}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recurring Mistakes (Requirement 7.3) */}
                      {session.recurring_mistakes?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-50 mb-2">
                            Recurring Mistakes
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {session.recurring_mistakes.map((mistake, idx) => (
                              <li key={idx} className="text-sm text-gray-300">
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Topics (Requirement 7.4) */}
                      {session.recommended_topics?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-50 mb-2">
                            Recommended Topics to Practice
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {session.recommended_topics.map((topic, idx) => (
                              <Badge key={idx} variant="primary">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommended Questions (Requirement 7.4) */}
                      {session.recommended_questions?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-50 mb-2">
                            Recommended Questions
                          </h4>
                          <div className="space-y-2">
                            {session.recommended_questions.map((question, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuestionClick(question.id)}
                                className="w-full text-left p-2 bg-black-elevated rounded border border-border-subtle hover:border-accent-primary/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-50 hover:text-accent-primary">
                                    {question.title}
                                  </span>
                                  <Badge variant={getDifficultyColor(question.difficulty)} size="sm">
                                    {question.difficulty}
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        {sessions.length >= 20 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Showing your 20 most recent sessions
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default TutorSessionHistory;
