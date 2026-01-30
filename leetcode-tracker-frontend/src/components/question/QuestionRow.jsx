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
}) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const difficultyVariant = Badge.getDifficultyVariant(question.difficulty);
  const topics = question.topics ? question.topics.split(',').map(t => t.trim()).filter(Boolean) : [];
  const maxTopics = 5; // Show more topics
  const frequency = question.frequency || 0;
  const maxFrequency = 100; // Normalize frequency display

  const MotionRow = prefersReducedMotion ? 'div' : motion.div;

  return (
    <MotionRow
      layoutId={layoutId}
      className={`
        group flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2
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

      {/* Title - Takes most space */}
      <div className="flex-1 min-w-0 overflow-hidden pr-1">
        <h3 className="text-[11px] sm:text-sm font-semibold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
          {question.title}
        </h3>
      </div>

      {/* Difficulty Badge - Hide on very small screens */}
      <div className="hidden xs:block flex-shrink-0">
        <Badge variant={difficultyVariant} size="sm" className="text-[9px] sm:text-xs whitespace-nowrap px-1 sm:px-2 py-0.5">
          {question.difficulty?.charAt(0) || 'M'}
        </Badge>
      </div>

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
