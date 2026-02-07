import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from '../utils/toast';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ErrorPanel from '../components/ui/ErrorPanel';
import TutorPanel from '../components/tutor/TutorPanel';
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
  const { companyId: companyIdFromUrl, questionId: questionIdFromUrl } = useParams(); // Slugs from URL (company-slug/question-slug format)
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { openFocusMode, closeFocusMode } = useUIStore();
  
  // Get return path from location state, default to companies list
  const returnPath = location.state?.returnTo || '/companies';
  
  // CRITICAL: Prefer questionId (ObjectId) from location.state over slug from URL
  // This ensures we use the exact question ID from QuestionList, not just slug matching
  // Slug matching can return the wrong question if multiple questions have similar slugs
  const questionIdFromState = location.state?.questionId; // ObjectId from QuestionList
  const questionId = questionIdFromState || questionIdFromUrl; // Use ObjectId if available, fallback to slug
  
  // Get company ID from state or URL
  const companyId = location.state?.companyId || companyIdFromUrl;

  const [question, setQuestion] = useState(null);

  // Use the question timer hook
  // Pass question?.solved to prevent auto-starting timer if question is already solved
  const { 
    elapsedTime, 
    isRunning, 
    formattedTime, 
    startTimer, 
    stopTimer, 
    resetTimer,
    saveTime 
  } = useQuestionTimer(questionId, user?.id, question?.solved);
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
  const hasInitializedRef = useRef(false);

  // Track initialized questionIds to prevent double initialization
  const initializedQuestionsRef = useRef(new Set());
  const lastQuestionIdRef = useRef(null);
  const lastLocationKeyRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const fetchingQuestionRef = useRef(false);
  const fetchedQuestionsRef = useRef(new Set());
  const visibilityDebounceTimeoutRef = useRef(null);
  const markingSolvedRef = useRef(false); // Idempotency guard for mark solved
  const markingUnsolvedRef = useRef(false); // Idempotency guard for mark unsolved
  
  // Initialize session and start timer
  useEffect(() => {
    // If questionId changed, reset initialization tracking
    if (lastQuestionIdRef.current !== questionId) {
      initializedQuestionsRef.current.clear();
      fetchQuestionContentRef.current.clear();
      fetchedQuestionsRef.current.clear(); // Clear fetched questions when questionId changes
      fetchingQuestionRef.current = false; // Reset fetching flag
      lastQuestionIdRef.current = questionId;
    }
    
    // Check if this is a navigation to Focus Mode (location key changes)
    const isNavigation = location.key !== lastLocationKeyRef.current;
    const wasDifferentLocation = lastLocationKeyRef.current !== null;
    lastLocationKeyRef.current = location.key;
    
    // Prevent double initialization in React StrictMode - use Set to track by questionId
    // But allow refresh if we're returning to the same question (component remounts or navigation)
    const isNewQuestion = !initializedQuestionsRef.current.has(questionId);
    
    if (!questionId) return;
    
    // If navigating to Focus Mode (even same question), refresh the question data
    // This ensures we get the latest solve status if it was changed outside Focus Mode
    if (isNavigation && wasDifferentLocation && !isNewQuestion) {
      // Clear the question from initialized set to force refresh
      initializedQuestionsRef.current.delete(questionId);
    }
    
    if (isNewQuestion || (isNavigation && wasDifferentLocation)) {
      initializedQuestionsRef.current.add(questionId);
    }

    openFocusMode(questionId);
    
    // Always fetch question to get latest status (especially important when returning to Focus Mode)
    // Clear any pending refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Small delay to prevent rapid successive calls
    refreshTimeoutRef.current = setTimeout(() => {
      // Force refresh if navigating to same question (to get latest status)
      const shouldForceRefresh = isNavigation && wasDifferentLocation && !isNewQuestion;
      fetchQuestion(shouldForceRefresh);
      if (isNewQuestion || (isNavigation && wasDifferentLocation)) {
        initializeSession();
      }
    }, 100);

    // Timer will auto-start via useQuestionTimer hook when question loads
    // But we'll pause it if question is solved (handled in fetchQuestion)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // Only remove from Set when component unmounts (not on re-render)
      initializedQuestionsRef.current.delete(questionId);
      closeFocusMode();
      persistSession();
      // Timer continues running even after unmount
    };
  }, [questionId, location.key]);


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
      // Failed to persist session
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
      // Failed to update session state
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

  const fetchQuestion = async (forceRefresh = false) => {
    // Validate questionId exists
    if (!questionId || questionId.trim() === '') {
      setQuestionError({
        title: 'Invalid Question',
        message: 'No question ID provided. Please select a question from the list.',
      });
      setIsLoadingQuestion(false);
      return;
    }

    // Don't show loading spinner if this is a background refresh
    if (!forceRefresh) {
      setIsLoadingQuestion(true);
    }
    setQuestionError(null);

    try {
      // CRITICAL: Use questionId which prefers ObjectId from state over slug from URL
      // This ensures we fetch the exact question that was selected in QuestionList
      // If questionIdFromState exists, it's the ObjectId; otherwise it's the slug from URL
      const response = await api.get(`/questions/${questionId}`, {
        params: { 
          user_id: user?.id,
          _t: Date.now() // Cache busting parameter
        }
      });
      
      // Verify the fetched question matches the expected ID if we have it from state
      if (questionIdFromState && response.data.id !== questionIdFromState) {
        console.warn('[FocusMode] Question ID mismatch:', {
          expected: questionIdFromState,
          received: response.data.id,
          urlSlug: questionIdFromUrl
        });
        // Still use the fetched question, but log the warning
      }
      
      const previousSolved = question?.solved;
      const newSolved = response.data.solved;
      
      // Update question state with fresh backend data (single source of truth)
      setQuestion(response.data);
      setQuestionError(null);
      
      // Validate and sync session state with backend solved status
      // Always trust backend response - no optimistic updates
      // Backend is single source of truth for solved status
      if (response.data.solved === true) {
        // Backend confirms question is solved - validate and sync state
        if (sessionState !== 'review' && sessionState !== 'solved') {
          setSessionState('review');
        }
        
        // Auto-pause timer when question is solved
        if (isRunning) {
          stopTimer();
        }
      } else {
        // Backend confirms question is NOT solved - validate and sync state
        // Reset session state if it was previously marked as solved/review
        if (sessionState === 'review' || sessionState === 'solved') {
          setSessionState('not_started');
        }
        
        // Validation: Reset if there was a mismatch
        if (previousSolved === true && newSolved === false) {
          setSessionState('not_started');
        }
      }
      
      // Fetch question content from LeetCode via backend proxy (only if not already loaded)
      if (!questionContent || forceRefresh) {
        // Clear the content ref to allow re-fetching
        if (forceRefresh) {
          fetchQuestionContentRef.current.delete(questionId);
        }
        fetchQuestionContent();
      }
    } catch (err) {
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
      
      // On error, remove from fetched set so it can retry
      fetchedQuestionsRef.current.delete(questionKey);
    } finally {
      setIsLoadingQuestion(false);
      fetchingQuestionRef.current = false;
    }
  };

  // Refresh question data when page becomes visible (e.g., returning from another tab/page)
  // This ensures we get the latest solve status if it was changed outside Focus Mode
  // CRITICAL: Always fetch fresh solved status from backend - single source of truth
  useEffect(() => {
    if (!questionId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && questionId) {
        // Debounce rapid visibility changes
        if (visibilityDebounceTimeoutRef.current) {
          clearTimeout(visibilityDebounceTimeoutRef.current);
        }
        visibilityDebounceTimeoutRef.current = setTimeout(() => {
          // Only fetch if not already fetching
          if (!fetchingQuestionRef.current) {
            fetchQuestion(true); // Force refresh to get latest solved status
          }
        }, 300);
      }
    };

    const handleFocus = () => {
      if (questionId) {
        // Debounce rapid focus events
        if (visibilityDebounceTimeoutRef.current) {
          clearTimeout(visibilityDebounceTimeoutRef.current);
        }
        visibilityDebounceTimeoutRef.current = setTimeout(() => {
          // Only fetch if not already fetching
          if (!fetchingQuestionRef.current) {
            fetchQuestion(true); // Force refresh to get latest solved status
          }
        }, 300);
      }
    };

    // Also listen for storage events (if question status is updated via localStorage)
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('question') && questionId) {
        // Debounce storage events
        if (visibilityDebounceTimeoutRef.current) {
          clearTimeout(visibilityDebounceTimeoutRef.current);
        }
        visibilityDebounceTimeoutRef.current = setTimeout(() => {
          // Only fetch if not already fetching
          if (!fetchingQuestionRef.current) {
            fetchQuestion(true); // Force refresh to get latest solved status
          }
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (visibilityDebounceTimeoutRef.current) {
        clearTimeout(visibilityDebounceTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestionContentRef = useRef(new Set());
  const fetchQuestionContent = async () => {
    // Prevent double calls - use Set to track by questionId
    // This persists across renders in React StrictMode
    if (fetchQuestionContentRef.current.has(questionId)) return;
    fetchQuestionContentRef.current.add(questionId);

    setLoadingContent(true);
    try {
      // Fetch from our backend proxy endpoint (avoids CORS issues)
      const response = await api.get(`/questions/${questionId}/leetcode-content`);
      
      if (response.data) {
        setQuestionContent(response.data);
        
      }
    } catch (err) {
      // Don't show error toast - content is optional
      // The UI will show "Question description not available" message
      // Remove from Set on error so it can retry
      fetchQuestionContentRef.current.delete(questionId);
    } finally {
      setLoadingContent(false);
      // Don't remove from set on success - keep it to prevent duplicate calls
    }
  };

  const handleClose = () => {
    // Don't show completion sheet if question is already solved - just close immediately
    if (question?.solved || sessionState === 'solved' || sessionState === 'review') {
      persistSession();
      stopTimer();
      navigate(returnPath);
      return;
    }
    
    // Show completion sheet only if question is not solved
    setShowCompletionSheet(true);
  };

  const handleCompletionClose = () => {
    persistSession();
    stopTimer();
    navigate(returnPath);
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
  };

  const handleMarkSolved = async () => {
    // Idempotency guard: prevent duplicate calls
    if (markingSolvedRef.current) return;
    
    // Also check if question is already solved
    if (question?.solved) {
      return; // Already solved, no need to call API again
    }
    
    // Validate user is authenticated
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    // CRITICAL: Use question.id (database ObjectId) instead of questionId (slug)
    // This ensures consistency with QuestionList which uses question.id
    // The backend can handle both formats, but using ObjectId is more reliable
    // Prefer question.id (ObjectId) over questionId (slug) for API calls
    const questionIdentifier = question?.id || questionId;
    
    // Validation: Ensure we have a valid question identifier before making API call
    if (!questionIdentifier) {
      toast.error('Question identifier not available. Please refresh the page.');
      console.error('[FocusMode] Cannot mark as solved: missing question identifier', { 
        questionId, 
        questionDbId: question?.id,
        question: question 
      });
      return;
    }
    
    markingSolvedRef.current = true;
    
    try {
      // Stop timer
      stopTimer();
      
      // Save time to backend
      await saveTime();
      
      // Mark as solved with time spent
      // Debug: Log the solve request
      if (process.env.NODE_ENV === 'development') {
        console.log('[FocusMode] Marking question as solved:', { 
          questionId: questionIdentifier, 
          questionSlug: questionId,
          questionDbId: question?.id,
          usingObjectId: !!question?.id,
          userId: user.id, 
          elapsedTime 
        });
      }
      const response = await api.post(`/questions/${questionIdentifier}/solve.json?user_id=${user.id}`, {
        time_spent_seconds: elapsedTime
      });
      
      // Debug: Log the response
      if (process.env.NODE_ENV === 'development') {
        console.log('[FocusMode] Solve response:', response.data);
      }
      
      // Check if the API call was successful
      if (response.status === 200 || response.status === 201) {
        toast.success('Marked as solved! 🎉');
        updateSessionState('solved');
        
        // CRITICAL: Always fetch fresh solved status from backend after marking as solved
        // Don't use optimistic updates - backend is single source of truth
        await fetchQuestion(true); // Force refresh to get latest solved status
        
        // End session with final time
        if (sessionId) {
          try {
            await api.post('/tutor/session/end', {
              session_id: sessionId,
              final_state: 'solved',
              total_time: elapsedTime,
            });
          } catch (sessionErr) {
            // Don't block navigation if session end fails
          }
        }
        
        // Don't show completion sheet if already solved - just close
        persistSession();
        // Navigate back immediately - backend should have committed the solve status
        navigate(returnPath, { 
          state: { 
            questionSolved: true,
            questionId: question?.id || questionId, // Use question.id (DB ID) if available, fallback to slug
            questionSlug: questionId // Also pass slug for matching
          } 
        });
      }
    } catch (err) {
      console.error('[FocusMode] Failed to mark as solved:', err);
      toast.error('Failed to mark as solved. Please try again.');
      // On error, refresh question data to ensure we have correct state
      await fetchQuestion(true);
    } finally {
      markingSolvedRef.current = false;
    }
  };

  const handleMarkUnsolved = async () => {
    // Idempotency guard: prevent duplicate calls
    if (markingUnsolvedRef.current) return;
    
    // Also check if question is already unsolved
    if (!question?.solved) {
      return; // Already unsolved, no need to call API again
    }
    
    // Validate user is authenticated
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    // CRITICAL: Use question.id (database ObjectId) instead of questionId (slug)
    // This ensures consistency with QuestionList which uses question.id
    // Prefer question.id (ObjectId) over questionId (slug) for API calls
    const questionIdentifier = question?.id || questionId;
    
    // Validation: Ensure we have a valid question identifier before making API call
    if (!questionIdentifier) {
      toast.error('Question identifier not available. Please refresh the page.');
      console.error('[FocusMode] Cannot mark as unsolved: missing question identifier', { 
        questionId, 
        questionDbId: question?.id,
        question: question 
      });
      return;
    }
    
    markingUnsolvedRef.current = true;
    
    try {
      // Mark as unsolved
      // Debug: Log the unsolve request
      if (process.env.NODE_ENV === 'development') {
        console.log('[FocusMode] Marking question as unsolved:', { 
          questionId: questionIdentifier, 
          questionSlug: questionId,
          questionDbId: question?.id,
          usingObjectId: !!question?.id,
          userId: user.id
        });
      }
      const response = await api.delete(`/questions/${questionIdentifier}/solve.json?user_id=${user.id}`);
      
      // Check if the API call was successful
      if (response.status === 200 || response.status === 204) {
        toast.success('Marked as unsolved');
        
        // CRITICAL: Always fetch fresh solved status from backend after marking as unsolved
        // Don't use optimistic updates - backend is single source of truth
        await fetchQuestion(true); // Force refresh to get latest solved status
        
        // Reset session state since question is no longer solved
        setSessionState('not_started');
        
        // Restart timer since question is now unsolved
        if (!isRunning) {
          startTimer();
        }
      }
    } catch (err) {
      toast.error('Failed to mark as unsolved. Please try again.');
      // On error, refresh question data to ensure we have correct state
      await fetchQuestion(true);
    } finally {
      markingUnsolvedRef.current = false;
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
              onClick={() => navigate(returnPath)}
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
              {!question?.solved && (
                <button
                  onClick={() => {
                    if (confirm('Reset timer to 00:00? This cannot be undone.')) {
                      resetTimer();
                      toast.info('Timer reset');
                    }
                  }}
                  className="ml-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Reset timer"
                >
                  ↻
                </button>
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
                // CRITICAL: Pass question.id (ObjectId) in state to ensure exact question matching
                // Use company-slug/question-slug format in URL
                const companySlug = question.company_slug || question.companySlug || companyId || 'all';
                const questionSlug = getQuestionIdentifier(question);
                navigate(`/companies/${companySlug}/focus/${questionSlug}`, {
                  state: {
                    questionId: question.id, // Pass exact ObjectId to ensure correct question is loaded
                    questionSlug: questionSlug, // Also pass slug for reference
                    companyId: question.company_id || question.companyId || companyId, // Pass company ID
                    returnTo: returnPath // Preserve return path
                  }
                });
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
              <>
                <div className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--accent-success-light)] text-[var(--accent-success)] rounded-[var(--radius-md)] text-sm font-medium border border-[var(--border-success)]">
                  ✅ Solved
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkUnsolved}
                  title="Mark as unsolved"
                >
                  ↩️ Unsolve
                </Button>
              </>
            )}
            {/* Debug: Show refresh button and status in development */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchQuestion(true);
                  }}
                  title="Refresh question status"
                >
                  🔄
                </Button>
                <div className="text-xs text-[var(--text-tertiary)] px-2">
                  Solved: {question?.solved ? 'Yes' : 'No'}
                </div>
              </>
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

      {/* Completion Bottom Sheet - Only show if question is not solved */}
      {!question?.solved && sessionState !== 'solved' && sessionState !== 'review' && (
        <CompletionBottomSheet
          isOpen={showCompletionSheet}
          onClose={handleCompletionClose}
          onSolved={handleCompletionSolved}
          onStuck={handleCompletionStuck}
          questionTitle={question?.title}
        />
      )}

    </div>
  );
}

export default FocusMode;
