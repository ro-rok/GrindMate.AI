
import { useState, useRef, useEffect } from 'react';
import toast from '../../utils/toast';
import ReactMarkdown from 'react-markdown';
import { FaCopy, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Button from '../ui/Button';
import Tabs from '../ui/Tabs';
import Pill from '../ui/Pill';
import ConfirmationModal from '../ui/ConfirmationModal';
import CodeHighlighter from '../CodeHighligter';
import api from '../../api';

/**
 * MessageBubble component
 * Improved message bubbles with collapsible long sections and copy buttons
 */
function MessageBubble({ role, content, markdownRenderers }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const shouldCollapse = content.length > 500;
  const displayContent = shouldCollapse && !isExpanded 
    ? content.substring(0, 500) + '...' 
    : content;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`max-w-[85%] p-4 rounded-[var(--radius-lg)] relative group ${
        role === 'user'
          ? 'bg-[var(--accent-primary-light)] text-[var(--text-primary)] border border-[var(--border-brand)] ml-auto'
          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-semibold ${
          role === 'user' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
        }`}>
          {role === 'user' ? 'You' : 'AI Tutor'}
        </div>
        <div className="flex items-center gap-2">
          {role === 'assistant' && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-tertiary hover:text-text-primary"
              aria-label="Copy message"
            >
              <FaCopy className="text-xs" />
            </button>
          )}
          {shouldCollapse && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-tertiary hover:text-text-primary"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
            </button>
          )}
        </div>
      </div>
      <div className="text-sm prose prose-invert max-w-none">
        <ReactMarkdown components={markdownRenderers}>
          {displayContent}
        </ReactMarkdown>
      </div>
      {copied && (
        <div className="absolute top-2 right-2 bg-accent-success text-white text-xs px-2 py-1 rounded">
          Copied!
        </div>
      )}
    </div>
  );
}

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
  const chatContainerRef = useRef(null);
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
    { 
      value: 'code_review', 
      label: 'Code Review', 
      icon: '🔍', 
      description: 'Reviews your code and suggests improvements' 
    },
  ];

  // Suggestion chips (context-aware)
  const suggestionChips = [
    'Clarify constraints',
    'Give hint',
    'Edge cases',
    'Optimize',
    'Walkthrough',
  ];

  // Action buttons configuration - contextual based on user code and mode
  const hasCode = userCode && userCode.trim().length > 0;
  const baseActions = [
    { 
      action: 'hint', 
      label: 'Give Hint', 
      icon: '💡', 
      description: 'Get a subtle hint without revealing too much',
      category: 'hints'
    },
    { 
      action: 'approach', 
      label: 'Explain Approach', 
      icon: '🎯', 
      description: 'Learn about the general approach to solve this',
      category: 'learning'
    },
    { 
      action: 'edge_cases', 
      label: 'Edge Cases', 
      icon: '🔍', 
      description: 'Discover important edge cases to consider',
      category: 'learning'
    },
    { 
      action: 'complexity', 
      label: 'Complexity Analysis', 
      icon: '📊', 
      description: 'Understand time and space complexity',
      category: 'learning'
    },
  ];

  // Code-specific actions (only show if user has code)
  const codeActions = hasCode ? [
    { 
      action: 'review_code', 
      label: 'Review My Code', 
      icon: '🔍', 
      description: 'Get feedback on your current implementation',
      category: 'code_review'
    },
    { 
      action: 'test_solution', 
      label: 'Test My Solution', 
      icon: '✅', 
      description: 'Validate if your approach is correct',
      category: 'code_review'
    },
    { 
      action: 'optimize', 
      label: 'Optimization Tips', 
      icon: '⚡', 
      description: 'Get suggestions to improve your solution',
      category: 'code_review'
    },
  ] : [];

  // Learning actions
  const learningActions = [
    { 
      action: 'explain_concept', 
      label: 'Explain Concept', 
      icon: '📚', 
      description: 'Deep dive into underlying concepts',
      category: 'learning'
    },
    { 
      action: 'similar_problems', 
      label: 'Similar Problems', 
      icon: '🔗', 
      description: 'Find related problems to practice',
      category: 'learning'
    },
  ];

  // Solution action (always available, but requires confirmation)
  const solutionAction = { 
    action: 'solution', 
    label: 'Show Full Solution', 
    icon: '✨', 
    description: 'Reveal the complete solution (requires confirmation)',
    variant: 'warning',
    category: 'solution'
  };

  // Combine actions based on context
  const actionButtons = [
    ...baseActions,
    ...codeActions,
    ...learningActions,
    solutionAction,
  ];

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [chatHistory]);
  
  // Ensure chat area remains scrollable while typing
  // Allow scrolling the chat container even when input is focused
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    const input = messageInputRef.current;
    if (!chatContainer || !input) return;

    // Handle wheel events on the input to scroll the chat container
    const handleInputWheel = (e) => {
      // Only scroll chat if input is focused and user is scrolling
      if (document.activeElement === input) {
        const delta = e.deltaY;
        const canScrollUp = chatContainer.scrollTop > 0;
        const canScrollDown = chatContainer.scrollTop < chatContainer.scrollHeight - chatContainer.clientHeight;
        
        // If chat can scroll in the direction of the wheel, scroll it instead
        if ((delta < 0 && canScrollUp) || (delta > 0 && canScrollDown)) {
          chatContainer.scrollTop += delta;
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Also handle wheel on chat container itself
    const handleContainerWheel = (e) => {
      // Ensure smooth scrolling
      chatContainer.scrollTop += e.deltaY;
    };

    input.addEventListener('wheel', handleInputWheel, { passive: false });
    chatContainer.addEventListener('wheel', handleContainerWheel, { passive: true });
    
    return () => {
      input.removeEventListener('wheel', handleInputWheel);
      chatContainer.removeEventListener('wheel', handleContainerWheel);
    };
  }, []);

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

  // Listen for quick review requests from code editor
  useEffect(() => {
    const handleQuickReview = (event) => {
      const message = event.detail;
      setCurrentMessage(message);
      // Trigger send after a small delay to ensure state is updated
      setTimeout(() => {
        handleSendMessage(message);
      }, 50);
    };

    window.addEventListener('sendTutorMessage', handleQuickReview);
    return () => {
      window.removeEventListener('sendTutorMessage', handleQuickReview);
    };
  }, []);

  // Handle mode change
  const handleModeChange = (mode) => {
    setTutorMode(mode);
    // Mode change is handled by Tabs component, no toast needed
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
      case 'review_code':
        message = 'Can you review my code and provide feedback?';
        break;
      case 'test_solution':
        message = 'Can you help me test if my solution approach is correct?';
        break;
      case 'optimize':
        message = 'Can you suggest optimizations for my current solution?';
        break;
      case 'explain_concept':
        message = 'Can you explain the underlying concepts and data structures needed for this problem?';
        break;
      case 'similar_problems':
        message = 'Can you suggest similar problems I should practice?';
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
            onClick={async () => {
              try {
                // Preserve formatting when copying code - use Clipboard API for better formatting support
                await navigator.clipboard.writeText(codeText);
                toast.success('Code copied to clipboard');
              } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = codeText;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                  document.execCommand('copy');
                  toast.success('Code copied to clipboard');
                } catch (fallbackErr) {
                  toast.error('Failed to copy code');
                }
                document.body.removeChild(textArea);
              }
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
    <div className="flex-1 flex flex-col transition-opacity duration-200 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Question Context Display */}
      
      {/* Tutor Mode Tabs */}
      <div className="px-3 py-2 border-b border-border-soft bg-black-elevated flex-shrink-0">
        <Tabs value={tutorMode} onChange={handleModeChange}>
          {tutorModes.map((mode) => (
            <Tabs.Tab key={mode.value} value={mode.value}>
              <span className="mr-1">{mode.icon}</span>
              {mode.label}
            </Tabs.Tab>
          ))}
        </Tabs>
      </div>

      {/* Action Buttons - Contextual and Organized */}
      <div className="px-3 py-2 border-b border-border-subtle bg-black-elevated flex-shrink-0">
        <h3 className="text-xs font-semibold text-text-primary mb-2">
          Quick Actions
        </h3>
        {/* Group actions by category for better organization */}
        <div className="space-y-2">
          {/* Primary actions (always visible) */}
          <div className="grid grid-cols-2 gap-1.5">
            {actionButtons
              .filter(btn => btn.category === 'hints' || btn.category === 'learning')
              .slice(0, 4)
              .map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleActionButton(btn.action)}
                  disabled={isLoading}
                  className={`px-2 py-1.5 rounded-md text-left transition-all text-xs ${
                    'bg-black-base border border-border-subtle hover:border-accent-primary text-text-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={btn.description}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{btn.icon}</span>
                    <span className="font-medium text-xs leading-tight">{btn.label}</span>
                  </div>
                </button>
              ))}
          </div>
          
          {/* Code review actions (only if user has code) */}
          {hasCode && (
            <div>
              <div className="text-xs text-text-tertiary mb-1 px-1">Code Review</div>
              <div className="grid grid-cols-2 gap-1.5">
                {actionButtons
                  .filter(btn => btn.category === 'code_review')
                  .map((btn) => (
                    <button
                      key={btn.action}
                      onClick={() => handleActionButton(btn.action)}
                      disabled={isLoading}
                      className="px-2 py-1.5 rounded-md text-left transition-all text-xs bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={btn.description}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{btn.icon}</span>
                        <span className="font-medium text-xs leading-tight">{btn.label}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
          
          {/* Solution action (always last, prominent) */}
          <div>
            {actionButtons
              .filter(btn => btn.category === 'solution')
              .map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => handleActionButton(btn.action)}
                  disabled={isLoading}
                  className="w-full px-2 py-1.5 rounded-md text-left transition-all text-xs bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={btn.description}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{btn.icon}</span>
                    <span className="font-medium text-xs leading-tight">{btn.label}</span>
                  </div>
                </button>
              ))}
          </div>
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
        <div className="px-3 py-2 bg-accent-danger/20 border-b border-accent-danger/30 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-accent-danger mb-0.5">
                Error
              </div>
              <div className="text-xs text-accent-danger/90 truncate">{error}</div>
              {resetTime && (
                <div className="text-xs text-accent-danger/70 mt-0.5">
                  Try again in {formatResetTime(resetTime)}
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-accent-danger hover:text-red-400 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Chat History - Subtask 10.4 */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 bg-black-base" 
        data-lenis-prevent
        style={{ 
          minHeight: 0, 
          flex: '1 1 0%',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          // Ensure scrollable even when input is focused
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}
      >
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
              <MessageBubble
                role={msg.role}
                content={msg.content}
                markdownRenderers={markdownRenderers}
              />
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 rounded-[var(--radius-lg)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input - Subtask 10.4 */}
      <div className="px-3 py-2 border-t border-border-soft bg-black-elevated flex-shrink-0">
        <div className="flex flex-col gap-1.5">
          {/* Suggestion Chips - Compact */}
          {currentMessage === '' && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {suggestionChips.map((chip) => (
                <Pill
                  key={chip}
                  variant="default"
                  size="sm"
                  className="cursor-pointer hover:bg-accent-primary/20 hover:border-accent-primary/30 transition-colors text-xs"
                  onClick={() => {
                    const messageMap = {
                      'Clarify constraints': 'Can you clarify the constraints and requirements?',
                      'Give hint': 'Can you give me a hint to help me get started?',
                      'Edge cases': 'What are the important edge cases I should consider?',
                      'Optimize': 'How can I optimize my solution?',
                      'Walkthrough': 'Can you walk me through the solution step by step?',
                    };
                    setCurrentMessage(messageMap[chip] || chip);
                    messageInputRef.current?.focus();
                  }}
                >
                  {chip}
                </Pill>
              ))}
            </div>
          )}
          
          <div className="flex gap-1.5">
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
              className="flex-1 px-2.5 py-1.5 bg-black-base text-text-primary rounded-md border border-border-soft focus:border-accent-primary focus:outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              onClick={() => handleSendMessage()}
              variant="primary"
              size="sm"
              loading={isLoading}
              disabled={!currentMessage.trim() || isLoading || requestsRemaining === 0}
              className="text-xs px-3 py-1.5"
            >
              Send
            </Button>
          </div>
          
          {/* Reset Tutor Button - Compact */}
          <Button
            onClick={handleResetTutor}
            disabled={chatHistory.length === 0}
            variant="ghost"
            size="sm"
            className="text-xs w-auto self-start py-1 px-2 h-auto"
          >
            🔄 Reset
          </Button>
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
