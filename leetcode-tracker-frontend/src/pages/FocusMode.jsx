import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import TutorPanel from '../components/tutor/TutorPanel';
import TutorFeedbackModal, { isSessionDismissed } from '../components/tutor/TutorFeedbackModal';
import { SmartRandomButton } from '../components/question';
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

  const [question, setQuestion] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'notes', 'tutor'
  const [notes, setNotes] = useState('');
  const [sessionState, setSessionState] = useState('not_started'); // 'not_started', 'attempting', 'stuck', 'solved', 'review'
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [editorCursorPosition, setEditorCursorPosition] = useState(0);
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [usedTutor, setUsedTutor] = useState(false);
  
  const timerIntervalRef = useRef(null);
  const codeEditorRef = useRef(null);
  const notesEditorRef = useRef(null);

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize session and start timer
  useEffect(() => {
    openFocusMode(questionId);
    fetchQuestion();
    initializeSession();

    // Start timer
    setTimerRunning(true);

    return () => {
      closeFocusMode();
      persistSession();
      stopTimer();
    };
  }, [questionId]);

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning]);

  // Handle tab visibility changes (pause/resume timer)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTimerRunning(false);
      } else {
        setTimerRunning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  const stopTimer = () => {
    setTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
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
    try {
      const response = await api.get(`/questions/${questionId}`, {
        params: { user_id: user?.id }
      });
      setQuestion(response.data);
      
      // Check if question is already solved
      if (response.data.solved) {
        setSessionState('review');
      }
    } catch (err) {
      console.error('Failed to fetch question:', err);
      toast.error('Failed to load question');
    }
  };

  const handleClose = () => {
    // Trigger feedback modal if user used tutor and session not dismissed (Subtask 12.4, Requirement 8.1)
    if (usedTutor && sessionId && !isSessionDismissed(sessionId)) {
      setShowFeedbackModal(true);
      return;
    }
    
    persistSession();
    stopTimer();
    navigate(-1);
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
      await api.post(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      toast.success('Marked as solved! 🎉');
      updateSessionState('solved');
      
      // End session
      if (sessionId) {
        await api.post('/tutor/session/end', {
          session_id: sessionId,
          final_state: 'solved',
          total_time: elapsedTime,
        });
      }
      
      // Trigger feedback modal if user used tutor and session not dismissed (Subtask 12.4, Requirement 8.1)
      if (usedTutor && sessionId && !isSessionDismissed(sessionId)) {
        setShowFeedbackModal(true);
      } else {
        setTimeout(() => navigate(-1), 1500);
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

  if (!question) {
    return (
      <div className="fixed inset-0 bg-black-base z-50 flex items-center justify-center">
        <div className="text-text-secondary">Loading question...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black-base z-50">
      <div className="h-full flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-black-elevated shadow-lg">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Question Title */}
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {question.title}
            </h1>
            
            {/* Difficulty Badge */}
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty}
            </Badge>
            
            {/* Company Tags */}
            {question.company_name && (
              <Badge className="bg-accent-primary/20 text-accent-primary">
                {question.company_name}
              </Badge>
            )}
            
            {/* Session State Badge */}
            <Badge className={getStateBadgeColor(sessionState)}>
              {getStateLabel(sessionState)}
            </Badge>
            
            {/* Timer */}
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <span>⏱️</span>
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <SmartRandomButton
              variant="ghost"
              className="text-sm"
              showToggle={false}
              onQuestionSelected={(question) => {
                // Navigate to the new question in Focus Mode
                navigate(`/focus/${question.question_id}`);
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
            <Button
              variant="success"
              size="sm"
              onClick={handleMarkSolved}
            >
              ✅ Mark Solved
            </Button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-text-tertiary hover:text-text-primary transition-colors text-sm"
            >
              Close (Esc)
            </button>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Question Details */}
          <div className="flex-1 overflow-y-auto p-6 bg-black-base">
            <Card className="p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    {question.title}
                  </h2>
                  
                  {/* Topics */}
                  {question.topics && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {question.topics.split(',').slice(0, 5).map((topic, i) => (
                        <span key={i} className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs">
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>Frequency: {question.frequency || 0}</span>
                  </div>
                </div>
                
                <a
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary-hover transition-colors text-sm"
                >
                  Open on LeetCode →
                </a>
              </div>
              
              {/* Question Statement */}
              {question.statement && (
                <div className="prose prose-invert max-w-none">
                  <div className="text-text-secondary whitespace-pre-wrap">
                    {question.statement}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel: Tabbed Interface */}
          <div className="w-[600px] border-l border-border-subtle bg-black-elevated flex flex-col">
            {/* Tab Navigation */}
            <div className="flex border-b border-border-subtle bg-black-elevated">
              <button
                onClick={() => handleTabChange('editor')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'editor'
                    ? 'text-accent-primary border-b-2 border-accent-primary bg-black-base'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black-base/50'
                }`}
              >
                💻 Editor (Ctrl+1)
              </button>
              <button
                onClick={() => handleTabChange('notes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'notes'
                    ? 'text-accent-primary border-b-2 border-accent-primary bg-black-base'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black-base/50'
                }`}
              >
                📝 Notes (Ctrl+2)
              </button>
              <button
                onClick={() => handleTabChange('tutor')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'tutor'
                    ? 'text-accent-primary border-b-2 border-accent-primary bg-black-base'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black-base/50'
                }`}
              >
                🤖 AI Tutor (Ctrl+3)
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Editor Tab */}
              {activeTab === 'editor' && (
                <div className="flex-1 flex flex-col p-4 transition-opacity duration-200">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">
                    Your Code
                  </h3>
                  <textarea
                    ref={codeEditorRef}
                    value={codeInput}
                    onChange={handleCodeChange}
                    placeholder="Write your solution here..."
                    className="flex-1 p-4 bg-black-base text-text-primary font-mono text-sm rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none resize-none transition-colors"
                  />
                  <p className="text-xs text-text-tertiary mt-2">
                    Your code will be included in AI tutor context for personalized feedback
                  </p>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="flex-1 flex flex-col p-4 transition-opacity duration-200">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">
                    Your Notes
                  </h3>
                  <textarea
                    ref={notesEditorRef}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes, jot down ideas, track your approach..."
                    className="flex-1 p-4 bg-black-base text-text-primary text-sm rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none resize-none transition-colors"
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
        </div>
      </div>

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
