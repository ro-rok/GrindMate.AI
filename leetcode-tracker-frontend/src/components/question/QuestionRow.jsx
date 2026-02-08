import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaStar, FaPlay, FaRobot, FaExternalLinkAlt } from 'react-icons/fa';
import Badge from '../ui/Badge';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * QuestionRow component
 * Dense Linear-style row for scannable question list
 * Left: status dot + title | Middle: difficulty + tags | Right: frequency + actions
 */
function QuestionRow({
  question,
  solved = false,
  attempted = false,
  starred = false,
  onStart,
  onAskAI,
  onMarkSolved,
  onStar,
  onOpenLeetCode,
  className = '',
  layoutId,
  maxFrequency = 100, // Maximum frequency in the dataset for percentage calculation
}) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const difficultyVariant = Badge.getDifficultyVariant(question.difficulty);
  const topics = question.topics ? question.topics.split(',').map(t => t.trim()).filter(Boolean) : [];
  const maxTopics = 3; // Show up to 3 topics on desktop
  const frequency = question.frequency || 0;
  const acceptanceRate = question.acceptance_rate ? Math.round(question.acceptance_rate * 100) : null;
  
  // Calculate frequency percentage based on max frequency in dataset
  const frequencyPercentage = maxFrequency > 0 ? Math.min((frequency / maxFrequency) * 100, 100) : 0;

  const MotionRow = prefersReducedMotion ? 'div' : motion.div;

  return (
    <MotionRow
      layoutId={layoutId}
      className={`
        group flex items-center gap-1 sm:gap-2 md:gap-3 px-2 sm:px-3 py-2
        bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]
        hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-2)] 
        transition-all duration-[var(--duration-fast)]
        cursor-pointer focus-visible:shadow-[var(--focus-ring)]
        w-full max-w-full
        ${className}
      `}
      onClick={() => onStart && onStart(question)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={prefersReducedMotion ? {} : { y: -1 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStart && onStart(question);
        }
      }}
    >
      {/* Status Indicator - Left */}
      <div className="flex-shrink-0 w-3 sm:w-4 flex items-center justify-center">
        {solved ? (
          <FaCheckCircle className="text-[var(--accent-success)] text-[10px] sm:text-xs" aria-label="Solved" />
        ) : attempted ? (
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--accent-warning)] ring-1 sm:ring-2 ring-[var(--accent-warning)]/20" aria-label="Attempted" />
        ) : (
          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[var(--text-tertiary)]/40 border border-[var(--border-subtle)]" aria-label="Not started" />
        )}
      </div>

      {/* Title - Takes most space on mobile, fixed width on desktop */}
      <div className="flex-1 md:flex-initial md:w-64 lg:w-80 min-w-0 overflow-hidden pr-1">
        <h3 className="text-[11px] sm:text-sm font-semibold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
          {question.title}
        </h3>
      </div>

      {/* Topics - Desktop only */}
      <div className="hidden md:flex flex-1 min-w-0 items-center gap-1.5 overflow-hidden">
        {topics.slice(0, maxTopics).map((topic, idx) => (
          <Badge 
            key={idx} 
            variant="secondary" 
            size="sm" 
            className="text-[10px] whitespace-nowrap px-2 py-0.5 flex-shrink-0"
          >
            {topic}
          </Badge>
        ))}
        {topics.length > maxTopics && (
          <Tooltip content={topics.slice(maxTopics).join(', ')}>
            <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
              +{topics.length - maxTopics}
            </span>
          </Tooltip>
        )}
      </div>

      {/* Difficulty Badge - Always visible with full text on desktop, abbreviated on mobile */}
      <div className="flex-shrink-0">
        <Badge variant={difficultyVariant} size="sm" className="text-[9px] sm:text-xs whitespace-nowrap px-1.5 sm:px-2 py-0.5">
          <span className="hidden sm:inline">{question.difficulty || 'Medium'}</span>
          <span className="sm:hidden">{question.difficulty?.charAt(0) || 'M'}</span>
        </Badge>
      </div>

      {/* Acceptance Rate - Desktop only */}
      {acceptanceRate !== null && (
        <div className="hidden md:flex flex-shrink-0 items-center gap-1.5 min-w-[70px]">
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase">AC</span>
          <span className="text-xs text-[var(--text-secondary)] font-semibold">
            {acceptanceRate}%
          </span>
        </div>
      )}

      {/* Frequency - Desktop only */}
      {frequency > 0 && (
        <div className="hidden md:flex flex-shrink-0 items-center gap-1.5 min-w-[80px]">
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase">Freq</span>
          <div className="flex items-center gap-1">
            <div className="w-10 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                style={{ width: `${frequencyPercentage}%` }}
                title={`Frequency: ${frequency} (${Math.round(frequencyPercentage)}% of max)`}
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              {frequency}
            </span>
          </div>
        </div>
      )}

      {/* Action Button - Only mark solved, always visible */}
      {onMarkSolved && (
        <div className="flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkSolved(question, !solved);
            }}
            aria-label={solved ? "Mark as unsolved" : "Mark as solved"}
            className={`p-1 sm:p-1.5 rounded hover:bg-[var(--bg-surface-2)] transition-colors ${solved ? 'text-[var(--accent-success)]' : 'text-[var(--text-tertiary)]'}`}
          >
            <FaCheckCircle className={`text-xs sm:text-sm ${solved ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </MotionRow>
  );
}

export default QuestionRow;
