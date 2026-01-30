import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * QuestionCard component
 * Displays a question with title, difficulty badge, company, timeframe
 * Shows checkmark icon if solved
 * Implements hover state with scale + glow
 * Supports layoutId for Framer Motion shared element transitions
 */
const QuestionCard = ({
  question,
  solved = false,
  onClick,
  layoutId,
  className = ''
}) => {
  const prefersReducedMotion = useReducedMotion();

  const difficultyVariant = Badge.getDifficultyVariant(question.difficulty);

  // Map timeframe to display text
  const timeframeDisplay = {
    '30_days': '30 days',
    '90_days': '3 months',
    'more_than_six_months': '6+ months',
    'all_time': 'All time'
  }[question.timeframe] || question.timeframe;

  const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

  const hoverAnimation = prefersReducedMotion ? {} : {
    scale: 1.05,
    boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)',
  };

  return (
    <MotionDiv
      layoutId={layoutId}
      whileHover={hoverAnimation}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`relative ${className}`}
    >
      <Card
        onClick={onClick}
        hoverable={false} // We handle hover in parent MotionDiv
        className="p-6 h-full flex flex-col justify-between cursor-pointer relative overflow-hidden"
      >
        {/* Solved indicator - top right */}
        {solved && (
          <div className="absolute top-4 right-4">
            <FaCheckCircle className="text-accent-success text-xl" />
          </div>
        )}

        {/* Content */}
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-lg font-semibold text-text-primary pr-8 line-clamp-2">
            {question.title}
          </h3>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={difficultyVariant} size="sm">
              {question.difficulty}
            </Badge>
            <span className="text-text-tertiary text-xs">•</span>
            <span className="text-text-secondary text-sm">{timeframeDisplay}</span>
          </div>

          {/* Topics */}
          {question.topics && (
            <div className="flex flex-wrap gap-1.5">
              {question.topics.split(',').slice(0, 5).map((topic, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  size="sm"
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                >
                  {topic.trim()}
                </Badge>
              ))}
              {question.topics.split(',').length > 5 && (
                <Badge 
                  variant="secondary" 
                  size="sm"
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                >
                  +{question.topics.split(',').length - 5}
                </Badge>
              )}
            </div>
          )}

          {/* Patterns (if available) */}
          {question.patterns && question.patterns.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {question.patterns.slice(0, 2).map((pattern, idx) => (
                <Badge key={idx} variant="primary" size="sm">
                  {pattern}
                </Badge>
              ))}
              {question.patterns.length > 2 && (
                <Badge variant="primary" size="sm">
                  +{question.patterns.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Footer - Frequency */}
        {question.frequency !== undefined && (
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Frequency</span>
              <span className="text-text-secondary font-medium">{question.frequency}</span>
            </div>
          </div>
        )}
      </Card>
    </MotionDiv>
  );
};

export default QuestionCard;
