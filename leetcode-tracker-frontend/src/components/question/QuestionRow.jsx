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
  const maxTopics = 3;
  const frequency = question.frequency || 0;
  const maxFrequency = 100; // Normalize frequency display

  const MotionRow = prefersReducedMotion ? 'div' : motion.div;

  return (
    <MotionRow
      layoutId={layoutId}
      className={`
        group flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)]
        bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]
        hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-2)] 
        transition-all duration-[var(--duration-fast)]
        cursor-pointer focus-visible:shadow-[var(--focus-ring)]
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
      {/* Status Indicator - Left - Enhanced */}
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        {solved ? (
          <FaCheckCircle className="text-[var(--accent-success)] text-base" aria-label="Solved" />
        ) : attempted ? (
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-warning)] ring-2 ring-[var(--accent-warning)]/20" aria-label="Attempted" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]/40 border border-[var(--border-subtle)]" aria-label="Not started" />
        )}
      </div>

      {/* Title - Left - Enhanced */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate leading-[var(--leading-tight)] group-hover:text-[var(--accent-primary)] transition-colors">
          {question.title}
        </h3>
      </div>

      {/* Middle: Difficulty + Tags - Compact */}
      <div className="flex items-center gap-[var(--space-1_5)] flex-shrink-0">
        <Badge variant={difficultyVariant} size="sm">
          {question.difficulty}
        </Badge>
        {topics.slice(0, maxTopics).map((topic, idx) => (
          <Badge key={idx} variant="default" size="sm" className="text-xs border-[var(--border-subtle)]">
            {topic}
          </Badge>
        ))}
        {topics.length > maxTopics && (
          <Badge variant="default" size="sm" className="text-xs border-[var(--border-subtle)]">
            +{topics.length - maxTopics}
          </Badge>
        )}
      </div>

      {/* Right: Frequency + Actions */}
      <div className="flex items-center gap-[var(--space-2)] flex-shrink-0">
        {/* Frequency mini bar - Enhanced */}
        {frequency > 0 && (
          <div className="flex items-center gap-[var(--space-1_5)] w-20">
            <div className="flex-1 h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)] rounded-full transition-all duration-[var(--duration-normal)]"
                style={{ width: `${Math.min((frequency / maxFrequency) * 100, 100)}%` }}
                aria-label={`Frequency: ${frequency}`}
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-mono tabular-nums min-w-[3ch] text-right font-medium">
              {frequency}
            </span>
          </div>
        )}

        {/* Actions - Reveal on hover/focus */}
        <div className={`flex items-center gap-1 transition-opacity duration-[var(--duration-fast)] ${isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}>
          {onStart && (
            <Tooltip content="Start in Focus Mode">
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(question);
                }}
                aria-label="Start in focus mode"
              >
                <FaPlay />
              </IconButton>
            </Tooltip>
          )}
          
          {onAskAI && (
            <Tooltip content="Ask AI Tutor">
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAskAI(question);
                }}
                aria-label="Ask AI tutor"
              >
                <FaRobot />
              </IconButton>
            </Tooltip>
          )}
          
          {onOpenLeetCode && question.leetcode_url && (
            <Tooltip content="Open on LeetCode">
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(question.leetcode_url, '_blank');
                }}
                aria-label="Open on LeetCode"
              >
                <FaExternalLinkAlt />
              </IconButton>
            </Tooltip>
          )}
          
          {onStar && (
            <Tooltip content={starred ? "Unstar" : "Star question"}>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(question);
                }}
                aria-label={starred ? "Unstar" : "Star question"}
                className={starred ? 'text-[var(--accent-warning)]' : ''}
              >
                <FaStar className={starred ? 'fill-current' : ''} />
              </IconButton>
            </Tooltip>
          )}
          
          {onMarkSolved && (
            <Tooltip content={solved ? "Mark as unsolved" : "Mark as solved"}>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkSolved(question, !solved);
                }}
                aria-label={solved ? "Mark as unsolved" : "Mark as solved"}
                className={solved ? 'text-[var(--accent-success)]' : ''}
              >
                <FaCheckCircle className={solved ? 'fill-current' : ''} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </MotionRow>
  );
}

export default QuestionRow;
