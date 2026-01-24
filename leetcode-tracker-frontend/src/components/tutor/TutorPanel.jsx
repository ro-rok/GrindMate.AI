import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import Button from '../ui/Button';
import ConfirmationModal from '../ui/ConfirmationModal';
import CodeHighlighter from '../CodeHighligter';
import api from '../../api';

/**
 * TutorPanel Component
 * 
 * Provides AI tutoring interface with:
 * - Mode selector (Socratic, ELI5, Interview)
 * - Action buttons (hints, explanations, etc.)
 * - Chat interface with message history
 * - Solution confirmation dialog
 * - Reset tutor functionality
 * - Rate limit display
 * - Markdown formatting for AI responses
 * 
 * Requirements: 4.1-4.5, 6.1-6.5
 */
function TutorPanel({
  questionId,
  questionContext,
  userCode,
  selectedLanguage,
  onHintsUsedChange,
  onTokensUpdate,
}) {
  // State
  const [tutorMode, setTutorMode] = useState('socratic');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSolutionConfirm, setShowSolutionConfirm] = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState(null);
  const [requestsRemaining, setRequestsRemaining] = useState(null);
  const [resetTime, setResetTime] = useState(null);
  
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Tutor modes configuration
  const tutorModes = [
    { 
      value: 'socratic', 
      label: 'Socratic', 
      icon: '🤔', 
      description: 'Guides with questions to help you discover the solution' 
    },
    { 
      value: 'eli5', 
      label: 'ELI5', 
      icon: '👶', 
      description: 'Explains concepts in simple, easy-to-understand terms' 
    },
    { 
      value: 'interview', 
      label: 'Interview', 
      icon: '💼', 
      description: 'Simulates technical interview coaching' 
    },
  ];

  // Action buttons configuration
  const actionButtons = [
    { 
      action: 'hint', 
      label: 'Give Hint', 
      icon: '💡', 
      description: 'Get a subtle hint without revealing too much' 
    },
    { 
      action: 'approach', 
      label: 'Explain Approach', 
      icon: '🎯', 
      description: 'Learn about the general approach to solve this' 
    },
    { 
      action: 'edge_cases', 
      label: 'Edge Cases', 
      icon: '🔍', 
      description: 'Discover important edge cases to consider' 
    },
    { 
      action: 'complexity', 
      label: 'Complexity Analysis', 
      icon: '📊', 
      description: 'Understand time and space complexity' 
    },
    { 
      action: 'solution', 
      label: 'Show Full Solution', 
      icon: '✨', 
      description: 'Reveal the complete solution (requires confirmation)',
      variant: 'warning'
    },
  ];

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (questionId) {
      const storageKey = `tutor-chat-${questionId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setChatHistory(JSON.parse(saved));
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      }
    }
  }, [questionId]);

  // Save chat history to localStorage
  useEffect(() => {
    if (questionId && chatHistory.length > 0) {
      const storageKey = `tutor-chat-${questionId}`;
      localStorage.setItem(storageKey, JSON.stringify(chatHistory));
    }
  }, [questionId, chatHistory]);

  // Handle mode change
  const handleModeChange = (mode) => {
    setTutorMode(mode);
    toast.success(`Switched to ${mode} mode`);
  };

  // Send message to AI tutor
  const handleSendMessage = async (messageOverride = null) => {
    const message = messageOverride || currentMessage;
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/tutor/chat', {
        question_id: questionId,
        message: message,
        user_code: userCode || null,
        language: selectedLanguage || null,
        tutor_mode: tutorMode,
      });

      // Add assistant response to history
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response_text,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [...prev, assistantMessage]);

      // Update rate limit info
      if (response.data.tokens_remaining !== undefined) {
        setTokensRemaining(response.data.tokens_remaining);
        if (onTokensUpdate) {
          onTokensUpdate(response.data.tokens_remaining);
        }
      }
      if (response.data.requests_remaining !== undefined) {
        setRequestsRemaining(response.data.requests_remaining);
      }
      if (response.data.hints_used_count !== undefined && onHintsUsedChange) {
        onHintsUsedChange(response.data.hints_used_count);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Handle rate limit error
      if (err.response?.status === 429) {
        const errorData = err.response.data;
        setError(errorData.error_message || 'Rate limit exceeded');
        setRequestsRemaining(0);
        if (errorData.reset_time_unix) {
          setResetTime(new Date(errorData.reset_time_unix * 1000));
        }
        toast.error('Rate limit exceeded. Please try again later.');
      } else {
        const errorMessage = err.response?.data?.error_message || err.message || 'Failed to send message';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action button clicks
  const handleActionButton = async (action) => {
    let message = '';
    
    switch (action) {
      case 'hint':
        message = 'Can you give me a hint to help me get started?';
        break;
      case 'approach':
        message = 'Can you explain the general approach to solve this problem?';
        break;
      case 'edge_cases':
        message = 'What are the important edge cases I should consider?';
        break;
      case 'complexity':
        message = 'Can you explain the time and space complexity of the optimal solution?';
        break;
      case 'solution':
        // Show confirmation dialog
        setShowSolutionConfirm(true);
        return;
      default:
        return;
    }

    await handleSendMessage(message);
  };

  // Handle solution confirmation
  const handleConfirmSolution = async () => {
    setShowSolutionConfirm(false);
    await handleSendMessage('Please show me the complete solution with explanation.');
  };

  // Reset tutor conversation
  const handleResetTutor = async () => {
    try {
      await api.post('/tutor/reset', {
        question_id: questionId,
      });

      // Clear local state
      setChatHistory([]);
      setError(null);
      
      // Clear localStorage
      const storageKey = `tutor-chat-${questionId}`;
      localStorage.removeItem(storageKey);

      toast.success('Tutor conversation reset successfully');
    } catch (err) {
      console.error('Failed to reset tutor:', err);
      toast.error('Failed to reset tutor conversation');
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter: Send message
      if (e.ctrlKey && e.key === 'Enter' && messageInputRef.current === document.activeElement) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMessage, tutorMode, userCode, selectedLanguage]);

  // Markdown renderers for code highlighting
  const markdownRenderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');
      
      return !inline && match ? (
        <div className="relative group my-2">
          <button
            className="absolute top-2 right-2 text-xs bg-black/70 opacity-0 group-hover:opacity-100 text-white px-2 py-1 rounded hover:bg-gray-700 transition-opacity z-10"
            onClick={() => {
              navigator.clipboard.writeText(codeText);
              toast.success('Code copied to clipboard');
            }}
          >
            Copy
          </button>
          <CodeHighlighter code={codeText} language={match[1] || 'javascript'} />
        </div>
      ) : (
        <code className={`px-1.5 py-0.5 bg-black-base rounded text-accent-primary text-sm ${className}`} {...props}>
          {children}
        </code>
      );
    },
    p({ children }) {
      return <p className="mb-3 last:mb-0">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
    },
    strong({ children }) {
      return <strong className="font-semibold text-text-primary">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic text-text-secondary">{children}</em>;
    },
  };

  // Format reset time
  const formatResetTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex-1 flex flex-col transition-opacity duration-200 h-full">
      {/* Tutor Mode Selector - Subtask 10.1 */}
      <div className="p-4 border-b border-border-subtle bg-black-elevated">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Tutor Mode
        </h3>
        <div className="flex gap-2">
          {tutorModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleModeChange(mode.value)}
              className={`flex-1 p-3 rounded-lg text-xs transition-all ${
                tutorMode === mode.value
                  ? 'bg-accent-primary text-white shadow-md'
                  : 'bg-black-base text-text-secondary hover:bg-border-subtle hover:text-text-primary'
              }`}
              title={mode.description}
            >
              <div className="text-xl mb-1">{mode.icon}</div>
              <div className="font-medium">{mode.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons - Subtask 10.2 */}
      <div className="p-4 border-b border-border-subtle bg-black-elevated">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {actionButtons.map((btn) => (
            <button
              key={btn.action}
              onClick={() => handleActionButton(btn.action)}
              disabled={isLoading}
              className={`p-3 rounded-lg text-left transition-all text-xs ${
                btn.variant === 'warning'
                  ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30'
                  : 'bg-black-base border border-border-subtle hover:border-accent-primary text-text-primary'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={btn.description}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{btn.icon}</span>
                <span className="font-medium">{btn.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rate Limit Information - Subtask 10.7 */}
      {(tokensRemaining !== null || requestsRemaining !== null) && (
        <div className="px-4 py-2 border-b border-border-subtle bg-black-base">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              {requestsRemaining !== null && (
                <div className="flex items-center gap-1">
                  <span className="text-text-tertiary">Requests:</span>
                  <span className={`font-mono font-semibold ${
                    requestsRemaining === 0 ? 'text-accent-danger' : 
                    requestsRemaining < 10 ? 'text-orange-400' : 
                    'text-accent-success'
                  }`}>
                    {requestsRemaining}
                  </span>
                </div>
              )}
              {tokensRemaining !== null && (
                <div className="flex items-center gap-1">
                  <span className="text-text-tertiary">Tokens:</span>
                  <span className="font-mono font-semibold text-text-secondary">
                    {tokensRemaining.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {resetTime && (
              <div className="text-text-tertiary">
                Resets in: {formatResetTime(resetTime)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 bg-accent-danger/20 border-b border-accent-danger/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="text-sm font-semibold text-accent-danger mb-1">
                Error
              </div>
              <div className="text-xs text-accent-danger/90">{error}</div>
              {resetTime && (
                <div className="text-xs text-accent-danger/70 mt-1">
                  Try again in {formatResetTime(resetTime)}
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-accent-danger hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Chat History - Subtask 10.4 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black-base">
        {chatHistory.length === 0 ? (
          <div className="text-center text-text-tertiary text-sm py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-medium mb-1">Ask me anything about this problem!</p>
            <p className="text-xs">Use the quick actions above or type your own question</p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-accent-primary/20 text-text-primary border border-accent-primary/30'
                    : 'bg-black-elevated text-text-secondary border border-border-subtle'
                }`}
              >
                <div className="text-xs font-semibold mb-2 opacity-75">
                  {msg.role === 'user' ? 'You' : 'AI Tutor'}
                </div>
                <div className="text-sm prose prose-invert max-w-none">
                  <ReactMarkdown components={markdownRenderers}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-black-elevated border border-border-subtle p-3 rounded-lg">
              <div className="flex items-center gap-2 text-text-tertiary text-sm">
                <div className="animate-spin">⏳</div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input - Subtask 10.4 */}
      <div className="p-4 border-t border-border-subtle bg-black-elevated">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={messageInputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a question... (Ctrl+Enter to send)"
              disabled={isLoading || requestsRemaining === 0}
              className="flex-1 px-3 py-2 bg-black-base text-text-primary rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              onClick={() => handleSendMessage()}
              variant="primary"
              size="sm"
              loading={isLoading}
              disabled={!currentMessage.trim() || isLoading || requestsRemaining === 0}
            >
              Send
            </Button>
          </div>
          
          {/* Reset Tutor Button - Subtask 10.6 */}
          <button
            onClick={handleResetTutor}
            disabled={chatHistory.length === 0}
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            🔄 Reset Conversation
          </button>
        </div>
      </div>

      {/* Solution Confirmation Dialog - Subtask 10.5 */}
      <ConfirmationModal
        isOpen={showSolutionConfirm}
        onClose={() => setShowSolutionConfirm(false)}
        onConfirm={handleConfirmSolution}
        title="Show Full Solution?"
        message="Are you sure you want to see the complete solution? This will reveal the answer and may impact your learning. Consider trying the hints first."
        confirmText="Yes, Show Solution"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

export default TutorPanel;
