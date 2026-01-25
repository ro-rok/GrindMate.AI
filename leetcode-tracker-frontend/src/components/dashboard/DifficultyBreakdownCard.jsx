import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * DifficultyBreakdownCard component
 * Displays solved count breakdown by difficulty (Easy, Medium, Hard)
 * Supports demo mode for anonymous users
 * 
 * Requirements: 4.5
 */
const DifficultyBreakdownCard = ({ 
  difficultyBreakdown = { EASY: 0, MEDIUM: 0, HARD: 0 },
  isDemo = false,
  cardVariant = 'matte'
}) => {
  const prefersReducedMotion = useReducedMotion();

  const difficulties = [
    { 
      level: 'EASY', 
      label: 'Easy', 
      color: 'text-accent-success', 
      bgColor: 'bg-accent-success/20',
      borderColor: 'border-accent-success/30',
      icon: '✓'
    },
    { 
      level: 'MEDIUM', 
      label: 'Medium', 
      color: 'text-accent-warning', 
      bgColor: 'bg-accent-warning/20',
      borderColor: 'border-accent-warning/30',
      icon: '⚡'
    },
    { 
      level: 'HARD', 
      label: 'Hard', 
      color: 'text-accent-danger', 
      bgColor: 'bg-accent-danger/20',
      borderColor: 'border-accent-danger/30',
      icon: '🔥'
    }
  ];

  const totalSolved = Object.values(difficultyBreakdown).reduce((sum, count) => sum + count, 0);

  return (
    <Card variant={cardVariant} className="p-6 relative">
      {/* Demo mode badge */}
      {isDemo && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
          Demo
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Difficulty Breakdown
          </h3>
          <p className="text-sm text-text-secondary">
            Problems solved by difficulty
          </p>
        </div>
        
        {/* Total count */}
        <div className="text-right">
          <div className="text-2xl font-bold text-accent-primary">
            {totalSolved}
          </div>
          <div className="text-xs text-text-secondary">
            Total
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {difficulties.map((difficulty, index) => {
          const count = difficultyBreakdown[difficulty.level] || 0;
          const percentage = totalSolved > 0 ? Math.round((count / totalSolved) * 100) : 0;
          
          return (
            <motion.div
              key={difficulty.level}
              className="relative"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {/* Difficulty header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{difficulty.icon}</span>
                  <span className={`text-sm font-medium ${difficulty.color}`}>
                    {difficulty.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    {percentage}%
                  </span>
                  <span className={`text-lg font-bold ${difficulty.color}`}>
                    {count}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${difficulty.bgColor} ${difficulty.borderColor} border`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.15 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary message */}
      {totalSolved === 0 ? (
        <div className="mt-6 pt-4 border-t border-border-subtle text-center">
          <p className="text-xs text-text-secondary">
            Start solving problems to see your breakdown
          </p>
        </div>
      ) : (
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Keep challenging yourself!</span>
            <span className="text-accent-primary font-medium">
              {totalSolved} solved
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DifficultyBreakdownCard;
