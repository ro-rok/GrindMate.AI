import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * TimeByDifficultyCard Component
 * Displays time spent breakdown by difficulty level
 */
function TimeByDifficultyCard({ timeByDifficulty = [], isDemo = false }) {
  const prefersReducedMotion = useReducedMotion();

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        return 'text-accent-success';
      case 'MEDIUM':
        return 'text-accent-warning';
      case 'HARD':
        return 'text-accent-error';
      default:
        return 'text-text-primary';
    }
  };

  const getDifficultyBadgeVariant = (difficulty) => {
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HARD':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!timeByDifficulty || timeByDifficulty.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Time by Difficulty
        </h2>
        <p className="text-text-tertiary text-center py-8">
          No data available yet. Start solving questions to see your time breakdown!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Time by Difficulty
      </h2>
      
      {isDemo && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">Demo data - Sign up to track your real progress!</p>
        </div>
      )}

      <div className="space-y-4">
        {timeByDifficulty.map((item, index) => (
          <motion.div
            key={item.difficulty}
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 bg-bg-secondary rounded-lg border-l-4"
            style={{
              borderLeftColor: 
                item.difficulty === 'EASY' ? '#10b981' :
                item.difficulty === 'MEDIUM' ? '#f59e0b' :
                '#ef4444'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-lg font-bold ${getDifficultyColor(item.difficulty)}`}>
                {item.difficulty}
              </h3>
              <Badge variant={getDifficultyBadgeVariant(item.difficulty)} size="sm">
                {item.questions_solved} solved
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary mb-1">Total Time</p>
                <p className="text-text-primary font-bold text-lg">{item.total_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary mb-1">Avg Time</p>
                <p className="text-text-primary font-bold text-lg">{item.avg_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary mb-1">Fastest</p>
                <p className="text-accent-success font-semibold">{item.fastest_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary mb-1">Slowest</p>
                <p className="text-accent-error font-semibold">{item.slowest_time_formatted}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default TimeByDifficultyCard;
