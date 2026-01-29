import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * StatsCard component
 * Displays key statistics: total solved, solved today, time spent today
 * Supports demo mode for anonymous users
 */
const StatsCard = ({ 
  totalSolved = 0,
  solvedToday = 0,
  timeSpentTodaySeconds = 0,
  isDemo = false,
  cardVariant = 'matte'
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Format time spent
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const stats = [
    {
      label: 'Total Solved',
      value: totalSolved,
      icon: '✓',
      color: 'text-accent-primary',
      bgColor: 'bg-accent-primary/20',
    },
    {
      label: 'Solved Today',
      value: solvedToday,
      icon: '🎯',
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/20',
    },
    {
      label: 'Time Today',
      value: formatTime(timeSpentTodaySeconds),
      icon: '⏱️',
      color: 'text-accent-warning',
      bgColor: 'bg-accent-warning/20',
    },
  ];

  return (
    <Card variant={cardVariant} className="p-6 relative">
      {/* Demo mode badge */}
      {isDemo && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
          Demo
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Your Stats
        </h3>
        <p className="text-sm text-text-secondary">
          Overall progress and today's activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`${stat.bgColor} rounded-lg p-4 border border-border-subtle`}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs text-text-secondary font-medium">
                {stat.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary message */}
      {totalSolved === 0 && (
        <div className="mt-6 pt-4 border-t border-border-subtle text-center">
          <p className="text-xs text-text-secondary">
            Start solving problems to track your progress
          </p>
        </div>
      )}
    </Card>
  );
};

export default StatsCard;
