import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';
import { getQuestionIdentifier } from '../../utils/slugify';
import api from '../../api';

/**
 * SmartRandomButton Component
 * 
 * Intelligent question selection button that considers:
 * - User's last 3 practiced companies
 * - Weak topics
 * - Recently attempted questions (7-day cooldown)
 * - Solved status (optional toggle)
 * 
 * Requirements: 10.1-10.5, 9.1-9.11
 */
export default function SmartRandomButton({ 
  variant = 'primary',
  className = '',
  showToggle = true,
  onQuestionSelected 
}) {
  const navigate = useNavigate();
  const [includeSolved, setIncludeSolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionReason, setSelectionReason] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  /**
   * Handle smart random button click
   * Requirements: 10.3, 13.2
   */
  const handleSmartRandom = async () => {
    setIsLoading(true);
    setError(null);
    setSelectionReason(null);

    try {
      // Call /api/questions/random/smart endpoint
      // Pass include_solved parameter
      const response = await api.get('/questions/random/smart', {
        params: {
          include_solved: includeSolved
        }
      });

      const question = response.data;
      
      // Store selection reason for tooltip display
      setSelectionReason(question.selection_reason);
      setShowTooltip(true);
      
      // Hide tooltip after 5 seconds
      setTimeout(() => setShowTooltip(false), 5000);

      // Navigate to Focus Mode with selected question
      if (onQuestionSelected) {
        onQuestionSelected(question);
      } else {
        navigate(`/focus/${getQuestionIdentifier(question)}`);
      }
    } catch (err) {
      console.error('Failed to get smart random question:', err);
      
      if (err.response?.status === 404) {
        setError('No questions available matching your criteria');
      } else if (err.response?.status === 401) {
        setError('Please log in to use smart random');
      } else {
        setError('Failed to get smart random question');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle toggle change
   * Requirements: 10.4, 10.5
   */
  const handleToggleChange = (e) => {
    setIncludeSolved(e.target.checked);
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-2">
        {/* Main Button */}
        <div className="relative">
          <Button
            variant={variant}
            className={`w-full ${className}`}
            onClick={handleSmartRandom}
            disabled={isLoading}
            aria-label="Get a smart random question based on your history"
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block mr-2">⚙️</span>
                Finding...
              </>
            ) : (
              <>
                🎯 Smart Random
              </>
            )}
          </Button>

          {/* Selection Reason Tooltip */}
          {showTooltip && selectionReason && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-black-lighter border border-accent-primary/30 rounded-lg shadow-lg z-10 animate-fade-in">
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-accent-primary">Why this question?</span>
                <br />
                {selectionReason}
              </p>
            </div>
          )}
        </div>

        {/* Include Solved Toggle */}
        {showToggle && (
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
            <input
              type="checkbox"
              checked={includeSolved}
              onChange={handleToggleChange}
              className="w-4 h-4 rounded border-gray-600 bg-black-lighter text-accent-primary focus:ring-accent-primary focus:ring-offset-0 focus:ring-2 cursor-pointer"
              aria-label="Include solved questions in selection"
            />
            <span>Include solved questions</span>
          </label>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
