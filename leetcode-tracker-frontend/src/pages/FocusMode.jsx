import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from '../utils/toast';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ErrorPanel from '../components/ui/ErrorPanel';
import TutorPanel from '../components/tutor/TutorPanel';
import TutorFeedbackModal, { isSessionDismissed } from '../components/tutor/TutorFeedbackModal';
import CompletionBottomSheet from '../components/focus/CompletionBottomSheet';
import { SmartRandomButton } from '../components/question';
import { getQuestionIdentifier } from '../utils/slugify';
import api from '../api';

/**
 * Focus mode page (modal-style route)
 * Full-screen problem view with AI tutor sidebar
 * Enhanced with sticky header, timer, keyboard shortcuts, and session state management
 */
function FocusMode() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openFocusMode, closeFocusMode } = useUIStore();

  // Use the question timer hook
  const { 
    elapsedTime, 
    isRunning, 
    formattedTime, 
    startTimer, 
    stopTimer, 
    saveTime 
  } = useQuestionTimer(questionId, user?.id);

  const [question, setQuestion] = useState(null);
  const [questionContent, setQuestionContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'notes', 'tutor'
  const [notes, setNotes] = useState('');
  const [sessionState, setSessionState] = useState('not_started'); // 'not_started', 'attempting', 'stuck', 'solved', 'review'
  const [sessionId, setSessionId] = useState(null);
  const [editorCursorPosition, setEditorCursorPosition] = useState(0);
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [usedTutor, setUsedTutor] = useState(false);
  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [tutorPanelCollapsed, setTutorPanelCollapsed] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [tutorPanelWidth, setTutorPanelWidth] = useState(() => {
    const saved = localStorage.getItem('focusModeTutorPanelWidth');
    return saved ? parseInt(saved, 10) : 600;
  });
  
  const codeEditorRef = useRef(null);
  const notesEditorRef = useRef(null);

  // Initialize session and start timer
  useEffect(() => {
    openFocusMode(questionId);
    fetchQuestion();
    initializeSession();

    // Start timer automatically
    startTimer();

    return () => {
      closeFocusMode();
      persistSession();
      // Timer continues running even after unmount
    };
  }, [questionId]);

  // Auto-load code template when question content is fetched
  useEffect(() => {
    if (questionContent?.codeSnippets && questionContent.codeSnippets.length > 0 && !codeInput) {
      // Find Python3 template first, then Python, then first available
      let template = questionContent.codeSnippets.find(s => s.langSlug === 'python3');
      if (!template) {
        template = questionContent.codeSnippets.find(s => s.langSlug === 'python');
      }
      if (!template) {
        template = questionContent.codeSnippets[0];
      }
      
      if (template) {
        setSelectedLanguage(template.langSlug);
        setCodeInput(template.code);
      }
    }
  }, [questionContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc: Close Focus Mode
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Ctrl+1: Switch to Editor tab
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        handleTabChange('editor');
        return;
      }

      // Ctrl+2: Switch to Notes tab
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        handleTabChange('notes');
        return;
      }

      // Ctrl+3: Switch to AI Tutor tab
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        handleTabChange('tutor');
        return;
      }

      // Ctrl+Enter: Send chat message (when in tutor tab)
      if (e.ctrlKey && e.key === 'Enter' && activeTab === 'tutor') {
        e.preventDefault();
        // TutorPanel handles this internally
        return;
      }

      // Ctrl+S: Mark as solved
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleMarkSolved();
        return;
      }

      // Ctrl+B: Bookmark question
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handleBookmark();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, sessionState]);

  const initializeSession = async () => {
    try {
      // Initialize session with backend
      const response = await api.post('/tutor/session/initialize', {
        question_id: questionId,
      });
      setSessionId(response.data.session_id);
      setSessionState('not_started');
    } catch (err) {
      console.error('Failed to initialize session:', err);
      // Continue without session tracking
    }
  };

  const persistSession = async () => {
    if (!sessionId) return;

    try {
      await api.post('/tutor/session/update', {
        session_id: sessionId,
        elapsed_time: elapsedTime,
        state: sessionState,
        hints_used: hintsUsed,
      });
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  };

  const updateSessionState = async (newState) => {
    setSessionState(newState);
    
    if (!sessionId) return;

    try {
      await api.post('/tutor/session/update', {
        session_id: sessionId,
        state: newState,
        elapsed_time: elapsedTime,
        hints_used: hintsUsed,
      });
    } catch (err) {
      console.error('Failed to update session state:', err);
    }
  };

  const handleTabChange = (tab) => {
    // Save current editor state before switching
    if (activeTab === 'editor' && codeEditorRef.current) {
      setEditorCursorPosition(codeEditorRef.current.selectionStart || 0);
      setEditorScrollTop(codeEditorRef.current.scrollTop || 0);
    } else if (activeTab === 'notes' && notesEditorRef.current) {
      setEditorScrollTop(notesEditorRef.current.scrollTop || 0);
    }

    setActiveTab(tab);

    // Restore editor state after switching (with small delay for render)
    setTimeout(() => {
      if (tab === 'editor' && codeEditorRef.current) {
        codeEditorRef.current.selectionStart = editorCursorPosition;
        codeEditorRef.current.selectionEnd = editorCursorPosition;
        codeEditorRef.current.scrollTop = editorScrollTop;
      } else if (tab === 'notes' && notesEditorRef.current) {
        notesEditorRef.current.scrollTop = editorScrollTop;
      }
    }, 50);
  };

  const fetchQuestion = async () => {
    // Validate questionId exists
    if (!questionId || questionId.trim() === '') {
      setQuestionError({
        title: 'Invalid Question',
        message: 'No question ID provided. Please select a question from the list.',
      });
      setIsLoadingQuestion(false);
      return;
    }

    setIsLoadingQuestion(true);
    setQuestionError(null);

    try {
      const response = await api.get(`/questions/${questionId}`, {
        params: { user_id: user?.id }
      });
      
      setQuestion(response.data);
      setQuestionError(null);
      
      // Check if question is already solved
      if (response.data.solved) {
        setSessionState('review');
      }
      
      // Fetch question content from LeetCode via backend proxy
      fetchQuestionContent();
    } catch (err) {
      console.error('Failed to fetch question:', err);
      
      // Determine error type and message
      let errorTitle = 'Failed to Load Question';
      let errorMessage = 'Unable to load the question. Please try again.';
      
      if (err.response?.status === 404) {
        errorTitle = 'Question Not Found';
        errorMessage = `The question with ID "${questionId}" could not be found. It may have been removed or the ID is incorrect.`;
      } else if (err.response?.status === 401) {
        errorTitle = 'Authentication Required';
        errorMessage = 'Please sign in to view this question.';
      } else if (err.response?.status === 400) {
        errorTitle = 'Invalid Question ID';
        errorMessage = `The question ID "${questionId}" is not in a valid format.`;
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = err.response?.data?.detail || err.message || errorMessage;
      }
      
      setQuestionError({
        title: errorTitle,
        message: errorMessage,
      });
      
      // Only show toast for non-404 errors (404 is shown in ErrorPanel)
      if (err.response?.status !== 404) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const fetchQuestionContent = async () => {
    setLoadingContent(true);
    try {
      // Fetch from our backend proxy endpoint (avoids CORS issues)
      const response = await api.get(`/questions/${questionId}/leetcode-content`);
      
      if (response.data) {
        setQuestionContent(response.data);
        
        // Show cache status in console for debugging
        if (response.data.cached) {
          console.log('✅ Loaded cached LeetCode content');
        } else {
          console.log('🌐 Fetched fresh LeetCode content (now cached)');
        }
      } else {
        console.warn('Question content not found in response');
      }
    } catch (err) {
      console.error('Failed to fetch question content:', err);
      // Don't show error toast - content is optional
      // The UI will show "Question description not available" message
    } finally {
      setLoadingContent(false);
    }
  };

  const handleClose = () => {
    // Show completion sheet instead of immediately closing
    setShowCompletionSheet(true);
  };

  const handleCompletionClose = () => {
    // Trigger feedback modal if user used tutor and session not dismissed
    if (usedTutor && sessionId && !isSessionDismissed(sessionId)) {
      setShowFeedbackModal(true);
      return;
    }
    
    persistSession();
    stopTimer();
    navigate(-1);
  };

  const handleCompletionSolved = () => {
    handleMarkSolved();
    setShowCompletionSheet(false);
  };

  const handleCompletionStuck = () => {
    updateSessionState('stuck');
    setActiveTab('tutor');
    setShowCompletionSheet(false);
    toast.info('Marked as stuck. AI tutor is ready to help!');
  };

  const handleHintsUsedChange = (count) => {
    setHintsUsed(count);
    setUsedTutor(true); // Track that user used the tutor
    
    // Transition to "stuck" if 2+ hints
    if (count >= 2 && sessionState === 'attempting') {
      updateSessionState('stuck');
    }
  };

  const handleTokensUpdate = (tokensRemaining) => {
    // Could update UI or store if needed
    console.log('Tokens remaining:', tokensRemaining);
  };

  const handleMarkSolved = async () => {
    try {
      // Stop timer
      stopTimer();
      
      // Save time to backend
      await saveTime();
      
      // Mark as solved with time spent
      await api.post(`/questions/${questionId}/solve.json?user_id=${user.id}`, {
        time_spent_seconds: elapsedTime
      });
      
      toast.success('Marked as solved! 🎉');
      updateSessionState('solved');
      
      // End session with final time
      if (sessionId) {
        await api.post('/tutor/session/end', {
          session_id: sessionId,
          final_state: 'solved',
          total_time: elapsedTime,
        });
      }
      
      // Show completion sheet or feedback modal
      if (usedTutor && sessionId && !isSessionDismissed(sessionId)) {
        setShowFeedbackModal(true);
      } else {
        // Show completion sheet
        setShowCompletionSheet(true);
      }
    } catch (err) {
      toast.error('Failed to mark as solved');
    }
  };

  const handleBookmark = async () => {
    try {
      // TODO: Implement bookmark functionality
      toast.success('Bookmarked! (Feature coming soon)');
    } catch (err) {
      toast.error('Failed to bookmark');
    }
  };

  const handleCodeChange = (e) => {
    setCodeInput(e.target.value);
    
    // Transition to "attempting" if first interaction
    if (sessionState === 'not_started' && e.target.value.trim().length > 0) {
      updateSessionState('attempting');
    }
  };

  const handleStuckClick = () => {
    updateSessionState('stuck');
    toast.info('Marked as stuck. Consider requesting hints!');
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty) => {
    const diffLower = difficulty?.toLowerCase();
    if (diffLower === 'easy') return 'bg-green-500/20 text-green-400';
    if (diffLower === 'medium') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  // Get state badge color
  const getStateBadgeColor = (state) => {
    switch (state) {
      case 'not_started': return 'bg-gray-500/20 text-gray-400';
      case 'attempting': return 'bg-blue-500/20 text-blue-400';
      case 'stuck': return 'bg-orange-500/20 text-orange-400';
      case 'solved': return 'bg-green-500/20 text-green-400';
      case 'review': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStateLabel = (state) => {
    return state.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Handle feedback modal close (Subtask 12.4)
  const handleFeedbackModalClose = () => {
    setShowFeedbackModal(false);
    // Navigate away after feedback modal closes
    setTimeout(() => navigate(-1), 500);
  };

  // Show loading state
  if (isLoadingQuestion && !question && !questionError) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-base)] z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin"></div>
          <div className="text-[var(--text-secondary)] text-lg">Loading question...</div>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (questionError && !question) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-base)] z-50 flex items-center justify-center p-[var(--space-4)]">
        <div className="max-w-md w-full">
          <ErrorPanel
            title={questionError.title}
            message={questionError.message}
            onRetry={fetchQuestion}
            retryLabel="Try Again"
            variant="error"
          />
          <div className="mt-4 text-center">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error overlay if question loaded but there's a secondary error
  if (!question) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-base)] z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin"></div>
          <div className="text-[var(--text-secondary)] text-lg">Loading question...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-base)] z-50" data-lenis-prevent style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
        {/* Error Banner (if error occurred but question loaded) */}
        {questionError && question && (
          <div className="px-[var(--space-6)] py-[var(--space-2)] bg-[var(--accent-danger-light)] border-b border-[var(--border-danger)]">
            <ErrorPanel
              title={questionError.title || 'Warning'}
              message={questionError.message}
              onRetry={fetchQuestion}
              variant="warning"
              className="border-0 bg-transparent p-0"
            />
          </div>
        )}
        
        {/* IDE Status Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-[var(--space-4)] py-[var(--space-2)] border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
          <div className="flex items-center gap-[var(--space-2)] flex-1 min-w-0">

            
            {/* Difficulty */}
            <Badge className={getDifficultyColor(question.difficulty)} size="sm">
              {question.difficulty}
            </Badge>
            
            {/* Session State */}
            <div className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium ${
              sessionState === 'solved' ? 'bg-[var(--accent-success-light)] text-[var(--accent-success)] border border-[var(--border-success)]' :
              sessionState === 'stuck' ? 'bg-[var(--accent-warning-light)] text-[var(--accent-warning)] border border-[var(--border-warning)]' :
              sessionState === 'attempting' ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border border-[var(--border-brand)]' :
              'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
            }`}>
              {getStateLabel(sessionState)}
            </div>
            
            {/* Divider */}
            <div className="w-px h-4 bg-[var(--border-subtle)]" />
            
            {/* Timer */}
            <div className="flex items-center gap-[var(--space-1_5)] px-[var(--space-2)] py-[var(--space-0_5)] bg-[var(--bg-surface-2)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-secondary)]">⏱</span>
              <span className="font-mono text-sm text-[var(--text-primary)] font-medium tabular-nums">
                {formattedTime}
              </span>
              {isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] animate-pulse" aria-label="Timer running" />
              )}
            </div>
            
            {/* Shortcuts Hint */}
            <div className="hidden md:flex items-center gap-[var(--space-2)] ml-[var(--space-2)]">
              <div className="w-px h-4 bg-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-tertiary)]">
                Ctrl+1/2/3 • Esc to close
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-[var(--space-2)]">
            <SmartRandomButton
              variant="ghost"
              size="sm"
              className="text-xs"
              showToggle={false}
              onQuestionSelected={(question) => {
                // Navigate to the new question in Focus Mode
                navigate(`/focus/${getQuestionIdentifier(question)}`);
              }}
            />
            {sessionState === 'attempting' && (
              <Button
                variant="warning"
                size="sm"
                onClick={handleStuckClick}
              >
                I'm Stuck
              </Button>
            )}
            {!question.solved && (
              <Button
                variant="success"
                size="sm"
                onClick={handleMarkSolved}
              >
                ✅ Mark Solved
              </Button>
            )}
            {question.solved && (
              <div className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--accent-success-light)] text-[var(--accent-success)] rounded-[var(--radius-md)] text-sm font-medium border border-[var(--border-success)]">
                ✅ Solved
              </div>
            )}
            <button
              onClick={handleClose}
              className="px-[var(--space-3)] py-[var(--space-1_5)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
            >
              Close (Esc)
            </button>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
          {/* Left Panel: Question Details */}
          <div 
            className="flex-1 p-[var(--space-4)] bg-[var(--bg-base)]" 
            data-lenis-prevent
            style={{ 
              minHeight: 0, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              position: 'relative'
            }}
          >
            <Card className="p-[var(--space-4)] mb-[var(--space-4)]" layoutId={questionId ? `question-${questionId}` : undefined}>
              <div className="flex items-start justify-between mb-[var(--space-3)]">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-[var(--space-2)] leading-[var(--leading-tight)]">
                    {question.title}
                  </h2>
                  
                  {/* Topics */}
                  {question.topics && (
                    <div className="flex gap-[var(--space-1_5)] flex-wrap mb-[var(--space-2)]">
                      {question.topics.split(',').slice(0, 5).map((topic, i) => (
                        <span key={i} className="px-[var(--space-2)] py-[var(--space-0_5)] bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded-[var(--radius-sm)] text-xs">
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-[var(--space-3)] text-sm text-[var(--text-secondary)]">
                    <span>Frequency: {question.frequency || 0}</span>
                  </div>
                </div>
                
                <a
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[var(--space-2)] text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors text-sm ml-[var(--space-4)] flex-shrink-0 focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)]"
                >
                  Open on LeetCode →
                </a>
              </div>
              
              {/* Question Content from LeetCode */}
              {loadingContent && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-text-secondary">Loading question content...</div>
                </div>
              )}
              
              {!loadingContent && questionContent?.content && (
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-[var(--text-secondary)] leetcode-content"
                    dangerouslySetInnerHTML={{ __html: questionContent.content }}
                  />
                  {/* Make Examples and Constraints collapsible via CSS */}
                  <style>{`
                    .leetcode-content h3:has(+ p),
                    .leetcode-content strong:contains("Example"),
                    .leetcode-content strong:contains("Constraint") {
                      cursor: pointer;
                    }
                  `}</style>
                </div>
              )}
              
              {!loadingContent && !questionContent?.content && (
                <div className="text-[var(--text-tertiary)] text-sm italic py-[var(--space-4)]">
                  Question description not available. Click "Open on LeetCode" to view the full problem.
                </div>
              )}
              
              {/* Code Snippets */}
              {questionContent?.codeSnippets && questionContent.codeSnippets.length > 0 && (
                <div className="mt-[var(--space-4)] p-[var(--space-3)] bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-[var(--space-2)]">
                    💻 Code Templates ({questionContent.codeSnippets.length} languages)
                  </h3>
                  <div className="flex gap-[var(--space-2)] mb-[var(--space-2)] flex-wrap">
                    {questionContent.codeSnippets.map((snippet) => (
                      <button
                        key={snippet.langSlug}
                        onClick={() => {
                          setSelectedLanguage(snippet.langSlug);
                          setCodeInput(snippet.code);
                          setActiveTab('editor');
                          toast.success(`${snippet.lang} template loaded`);
                        }}
                        className={`px-[var(--space-3)] py-[var(--space-1_5)] rounded-[var(--radius-md)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] ${
                          selectedLanguage === snippet.langSlug
                            ? 'bg-[var(--accent-primary)] text-white shadow-[var(--elevation-2)]'
                            : 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary-light)] hover:border-[var(--border-brand)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {snippet.lang}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-[var(--space-2)]">
                    Click any language to load its template in the code editor
                  </p>
                </div>
              )}
              
              {/* Hints */}
              {questionContent?.hints && questionContent.hints.length > 0 && (
                <div className="mt-6">
                  <details className="group">
                    <summary className="cursor-pointer text-[var(--text-primary)] font-semibold mb-2 hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
                      <span>💡</span>
                      <span>Hints ({questionContent.hints.length})</span>
                      <span className="ml-auto text-xs text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-2 mt-3">
                      {questionContent.hints.map((hint, index) => (
                        <div key={index} className="p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                          <span className="text-[var(--accent-primary)] font-semibold">Hint {index + 1}:</span>
                          <span className="text-[var(--text-secondary)] ml-2">{hint}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel: AI Tutor (Collapsible + Resizable) */}
          <div 
            className={`${tutorPanelCollapsed ? 'w-12' : ''} border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col transition-all duration-[var(--duration-normal)] relative`}
            style={!tutorPanelCollapsed ? { width: `${tutorPanelWidth}px`, minWidth: '400px', maxWidth: '800px' } : {}}
          >
            {/* Resize Handle / Collapse Toggle */}
            <button
              onClick={() => setTutorPanelCollapsed(!tutorPanelCollapsed)}
              onMouseDown={(e) => {
                // Allow drag to resize
                if (tutorPanelCollapsed) return;
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = tutorPanelWidth;
                
                const handleMouseMove = (moveEvent) => {
                  const diff = startX - moveEvent.clientX;
                  const newWidth = Math.max(400, Math.min(800, startWidth + diff));
                  setTutorPanelWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  // Save to localStorage
                  localStorage.setItem('focusModeTutorPanelWidth', tutorPanelWidth.toString());
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-12 bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-l-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] hover:border-[var(--border-brand)] transition-colors z-10 cursor-col-resize"
              aria-label={tutorPanelCollapsed ? 'Expand AI tutor' : 'Collapse AI tutor'}
            >
              {tutorPanelCollapsed ? '→' : '⋮'}
            </button>
            
            {!tutorPanelCollapsed && (
              <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            {/* Tab Navigation */}
            <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <button
                onClick={() => handleTabChange('editor')}
                className={`flex-1 px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] ${
                  activeTab === 'editor'
                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-base)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]/50'
                }`}
              >
                💻 Editor (Ctrl+1)
              </button>
              <button
                onClick={() => handleTabChange('notes')}
                className={`flex-1 px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] ${
                  activeTab === 'notes'
                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-base)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]/50'
                }`}
              >
                📝 Notes (Ctrl+2)
              </button>
              <button
                onClick={() => handleTabChange('tutor')}
                className={`flex-1 px-[var(--space-3)] py-[var(--space-2)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] ${
                  activeTab === 'tutor'
                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-base)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]/50'
                }`}
              >
                🤖 AI Tutor (Ctrl+3)
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
              {/* Editor Tab */}
              {activeTab === 'editor' && (
                <div className="flex-1 flex flex-col p-[var(--space-3)] transition-opacity duration-[var(--duration-fast)] overflow-hidden" style={{ minHeight: 0 }}>
                  <div className="flex items-center justify-between mb-[var(--space-2)]">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      Code Editor
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Quick Code Review Button */}
                      {codeInput && codeInput.trim() && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveTab('tutor');
                            // Small delay to ensure tab switches first
                            setTimeout(() => {
                              const reviewMessage = "Please review my code and provide feedback on:\n1. Correctness\n2. Time/space complexity\n3. Edge cases\n4. Code quality and best practices";
                              // Trigger the chat with review request
                              const event = new CustomEvent('sendTutorMessage', { detail: reviewMessage });
                              window.dispatchEvent(event);
                            }, 100);
                            toast.success('Requesting code review...');
                          }}
                          className="text-xs"
                        >
                          🔍 Quick Review
                        </Button>
                      )}
                      {/* Language selector in editor */}
                      {questionContent?.codeSnippets && questionContent.codeSnippets.length > 0 && (
                        <select
                          value={selectedLanguage}
                          onChange={(e) => {
                            const snippet = questionContent.codeSnippets.find(s => s.langSlug === e.target.value);
                            if (snippet) {
                              setSelectedLanguage(snippet.langSlug);
                              setCodeInput(snippet.code);
                              toast.success(`${snippet.lang} template loaded`);
                            }
                          }}
                          className="px-[var(--space-3)] py-[var(--space-1)] bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm focus:border-[var(--accent-primary)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] cursor-pointer"
                        >
                          {questionContent.codeSnippets.map((snippet) => (
                            <option key={snippet.langSlug} value={snippet.langSlug}>
                              {snippet.lang}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <textarea
                    ref={codeEditorRef}
                    value={codeInput}
                    onChange={handleCodeChange}
                    onKeyDown={(e) => {
                      // Handle Tab key for indentation
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.target.selectionStart;
                        const end = e.target.selectionEnd;
                        const newValue = codeInput.substring(0, start) + '    ' + codeInput.substring(end);
                        setCodeInput(newValue);
                        // Set cursor position after the inserted tab
                        setTimeout(() => {
                          e.target.selectionStart = e.target.selectionEnd = start + 4;
                        }, 0);
                      }
                      // Handle Shift+Tab for unindent
                      else if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        const start = e.target.selectionStart;
                        const lineStart = codeInput.lastIndexOf('\n', start - 1) + 1;
                        const lineText = codeInput.substring(lineStart, start);
                        if (lineText.startsWith('    ')) {
                          const newValue = codeInput.substring(0, lineStart) + codeInput.substring(lineStart + 4);
                          setCodeInput(newValue);
                          setTimeout(() => {
                            e.target.selectionStart = e.target.selectionEnd = start - 4;
                          }, 0);
                        }
                      }
                    }}
                    placeholder="Write your solution here..."
                    className="flex-1 p-[var(--space-3)] bg-[var(--bg-base)] text-[var(--text-primary)] font-mono text-sm rounded-[var(--radius-md)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] resize-none transition-colors"
                    spellCheck="false"
                  />
                  <div className="flex items-center justify-between mt-[var(--space-2)]">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      💡 Press Tab to indent, Shift+Tab to unindent
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {codeInput.length} characters
                    </p>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="flex-1 flex flex-col p-[var(--space-3)] transition-opacity duration-[var(--duration-fast)]" style={{ minHeight: 0 }}>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-[var(--space-2)]">
                    Your Notes
                  </h3>
                  <textarea
                    ref={notesEditorRef}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes, jot down ideas, track your approach..."
                    className="flex-1 p-[var(--space-3)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm rounded-[var(--radius-md)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] resize-none transition-colors leading-[var(--leading-relaxed)]"
                  />
                </div>
              )}

              {/* AI Tutor Tab */}
              {activeTab === 'tutor' && (
                <TutorPanel
                  questionId={questionId}
                  questionContext={question}
                  userCode={codeInput}
                  selectedLanguage={selectedLanguage}
                  onHintsUsedChange={handleHintsUsedChange}
                  onTokensUpdate={handleTokensUpdate}
                />
              )}
            </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Bottom Sheet */}
      <CompletionBottomSheet
        isOpen={showCompletionSheet}
        onClose={handleCompletionClose}
        onSolved={handleCompletionSolved}
        onStuck={handleCompletionStuck}
        questionTitle={question?.title}
      />

      {/* Tutor Feedback Modal - Subtask 12.4 (Requirement 8.1) */}
      <TutorFeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackModalClose}
        sessionId={sessionId}
        questionTitle={question?.title}
      />
    </div>
  );
}

export default FocusMode;
