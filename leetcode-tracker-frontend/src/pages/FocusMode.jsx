import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useUIStore from '../store/uiStore';
import useTutorStore from '../store/tutorStore';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import api from '../api';

/**
 * Focus mode page (modal-style route)
 * Full-screen problem view with AI tutor sidebar
 */
function FocusMode() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openFocusMode, closeFocusMode } = useUIStore();
  const {
    setCurrentQuestion,
    chatHistory,
    tutorMode,
    setTutorMode,
    unlockedLevels,
    isLoading,
    error,
    unlockHint,
    sendMessage,
    clearError,
  } = useTutorStore();

  const [question, setQuestion] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    openFocusMode(questionId);
    setCurrentQuestion(questionId);
    fetchQuestion();

    // Handle Esc key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      closeFocusMode();
      window.removeEventListener('keydown', handleEsc);
    };
  }, [questionId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchQuestion = async () => {
    try {
      const response = await api.get(`/questions/${questionId}`, {
        params: { user_id: user?.id }
      });
      setQuestion(response.data);
    } catch (err) {
      console.error('Failed to fetch question:', err);
      toast.error('Failed to load question');
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleUnlockHint = async (level) => {
    try {
      await unlockHint(questionId, level);
      toast.success(`Hint ${level} unlocked!`);
    } catch (err) {
      toast.error(err.message || 'Failed to unlock hint');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      await sendMessage(questionId, messageInput, codeInput || null);
      setMessageInput('');
      setCodeInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleMarkSolved = async () => {
    try {
      await api.post(`/questions/${questionId}/solve.json?user_id=${user.id}`);
      toast.success('Marked as solved! 🎉');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      toast.error('Failed to mark as solved');
    }
  };

  const hintLevels = [
    { level: 1, label: 'Hint 1', description: 'Gentle nudge' },
    { level: 2, label: 'Hint 2', description: 'Key insight' },
    { level: 3, label: 'Hint 3', description: 'Approach' },
    { level: 4, label: 'Hint 4', description: 'Algorithm' },
    { level: 5, label: 'Hint 5', description: 'Pseudocode' },
    { level: 6, label: 'Hint 6', description: 'Full solution' },
  ];

  const tutorModes = [
    { value: 'socratic', label: 'Socratic', icon: '🤔', description: 'Guides with questions' },
    { value: 'eli5', label: 'ELI5', icon: '👶', description: 'Simple explanations' },
    { value: 'interviewer', label: 'Interview', icon: '💼', description: 'Interview practice' },
  ];

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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-black-elevated">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-text-primary">
              Focus Mode
            </h1>
            <span className="text-sm text-text-tertiary">
              {question.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="success"
              size="sm"
              onClick={handleMarkSolved}
            >
              ✅ Mark Solved
            </Button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              Close (Esc)
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Question Details */}
          <div className="flex-1 overflow-y-auto p-6">
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-text-primary">
                  {question.title}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  question.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                  question.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {question.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm text-text-secondary">
                <span>Frequency: {question.frequency || 0}</span>
                {question.topics && (
                  <div className="flex gap-2 flex-wrap">
                    {question.topics.split(',').slice(0, 3).map((topic, i) => (
                      <span key={i} className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded">
                        {topic.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <a
                href={question.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary-hover transition-colors"
              >
                Open on LeetCode →
              </a>
            </Card>

            {/* Code Editor Area */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                Your Code (Optional)
              </h3>
              <textarea
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Paste your code here to get specific feedback..."
                className="w-full h-64 p-4 bg-black-base text-text-primary font-mono text-sm rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none resize-none"
              />
            </Card>
          </div>

          {/* Right: AI Tutor Sidebar */}
          <div className="w-96 border-l border-border-subtle bg-black-elevated flex flex-col">
            {/* Tutor Mode Selector */}
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Tutor Mode
              </h3>
              <div className="flex gap-2">
                {tutorModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setTutorMode(mode.value)}
                    className={`flex-1 p-2 rounded-lg text-xs transition-all ${
                      tutorMode === mode.value
                        ? 'bg-accent-primary text-white'
                        : 'bg-black-base text-text-secondary hover:bg-border-subtle'
                    }`}
                    title={mode.description}
                  >
                    <div>{mode.icon}</div>
                    <div className="font-medium">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hint Ladder */}
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Progressive Hints
              </h3>
              <div className="space-y-2">
                {hintLevels.map((hint) => {
                  const isUnlocked = unlockedLevels.has(hint.level);
                  const canUnlock = hint.level === 1 || unlockedLevels.has(hint.level - 1);

                  return (
                    <button
                      key={hint.level}
                      onClick={() => canUnlock && !isUnlocked && handleUnlockHint(hint.level)}
                      disabled={!canUnlock || isUnlocked}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        isUnlocked
                          ? 'bg-accent-success/20 border border-accent-success/30 text-accent-success'
                          : canUnlock
                          ? 'bg-black-base border border-border-subtle hover:border-accent-primary text-text-primary'
                          : 'bg-black-base border border-border-subtle text-text-tertiary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{hint.label}</div>
                          <div className="text-xs opacity-75">{hint.description}</div>
                        </div>
                        {isUnlocked ? '✓' : canUnlock ? '🔓' : '🔒'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 ? (
                <div className="text-center text-text-tertiary text-sm py-8">
                  <div className="text-4xl mb-2">💬</div>
                  <p>Ask me anything about this problem!</p>
                  <p className="text-xs mt-2">Or unlock hints above</p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-accent-primary/20 text-text-primary ml-4'
                        : 'bg-black-base text-text-secondary mr-4'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {msg.role === 'user' ? 'You' : 'AI Tutor'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2 bg-accent-danger/20 border-t border-accent-danger/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-accent-danger">{error}</span>
                  <button
                    onClick={clearError}
                    className="text-accent-danger hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border-subtle">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-black-base text-text-primary rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none text-sm disabled:opacity-50"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isLoading}
                  disabled={!messageInput.trim() || isLoading}
                >
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FocusMode;
