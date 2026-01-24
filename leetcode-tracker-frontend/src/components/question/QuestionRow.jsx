import { useState } from 'react';
import { FaCheckCircle, FaStar, FaPlay, FaRobot, FaBookmark } from 'react-icons/fa';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';

/**
 * QuestionRow component
 * Compact list view row for questions with quick actions
 */
function QuestionRow({
  question,
  solved = false,
  attempted = false,
  onStart,
  onAskAI,
  onMarkSolved,
  onStar,
  onBookmark,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);

  const difficultyVariant = Badge.getDifficultyVariant(question.difficulty);
  const topics = question.topics ? question.topics.split(',').map(t => t.trim()) : [];
  const maxTopics = 3;

  return (
    <div
      className={`group flex items-center gap-4 p-4 bg-black-elevated border border-border-soft rounded-lg hover:border-border-soft-hover hover:bg-black-elevated-hover transition-all duration-200 cursor-pointer ${className}`}
      onClick={() => onStart && onStart(question)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStart && onStart(question);
        }
      }}
    >
      {/* Status Indicator */}
      <div className="flex-shrink-0 w-8 flex items-center justify-center">
        {solved && (
          <FaCheckCircle className="text-accent-success text-lg" aria-label="Solved" />
        )}
        {!solved && attempted && (
          <div className="w-2 h-2 rounded-full bg-accent-warning" aria-label="Attempted" />
        )}
        {!solved && !attempted && (
          <div className="w-2 h-2 rounded-full bg-gray-600" aria-label="Not started" />
        )}
      </div>

      {/* Title + ID */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {question.title}
          </h3>
          {question.id && (
            <span className="text-xs text-text-tertiary font-mono flex-shrink-0">
              #{question.id.slice(-6)}
            </span>
          )}
        </div>
        
        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={difficultyVariant} size="sm">
            {question.difficulty}
          </Badge>
          {topics.slice(0, maxTopics).map((topic, idx) => (
            <Badge key={idx} variant="default" size="sm">
              {topic}
            </Badge>
          ))}
          {topics.length > maxTopics && (
            <Badge variant="default" size="sm">
              +{topics.length - maxTopics}
            </Badge>
          )}
          {question.frequency !== undefined && (
            <span className="text-xs text-text-tertiary">
              • Freq: {question.frequency}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions - Always visible for accessibility */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onStart && (
          <Tooltip content="Start in Focus Mode">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart(question);
              }}
              aria-label="Start in focus mode"
            >
              <FaPlay className="text-xs" />
            </Button>
          </Tooltip>
        )}
        
        {onAskAI && (
          <Tooltip content="Ask AI Tutor">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAskAI(question);
              }}
              aria-label="Ask AI tutor"
            >
              <FaRobot className="text-xs" />
            </Button>
          </Tooltip>
        )}
        
        {onMarkSolved && (
          <Tooltip content={solved ? "Mark as unsolved" : "Mark as solved"}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkSolved(question, !solved);
              }}
              aria-label={solved ? "Mark as unsolved" : "Mark as solved"}
            >
              <FaCheckCircle className={`text-xs ${solved ? 'text-accent-success' : 'text-text-tertiary'}`} />
            </Button>
          </Tooltip>
        )}
        
        {onStar && (
          <Tooltip content="Star question">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStar(question);
              }}
              aria-label="Star question"
            >
              <FaStar className="text-xs text-text-tertiary" />
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default QuestionRow;
