import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { FaClock, FaCheckCircle, FaBolt, FaHourglass } from 'react-icons/fa';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * OverallStatsCard Component
 * Displays overall statistics including total time, questions solved, etc.
 */
function OverallStatsCard({ stats = {}, isDemo = false }) {
  const prefersReducedMotion = useReducedMotion();

  const statItems = [
    {
      icon: FaCheckCircle,
      label: 'Questions Solved',
      value: stats.total_questions_solved || 0,
      color: 'text-accent-success'
    },
    {
      icon: FaClock,
      label: 'Total Time',
      value: stats.total_time_formatted || '0s',
      color: 'text-accent-primary'
    },
    {
      icon: FaHourglass,
      label: 'Avg Time',
      value: stats.avg_time_per_question_formatted || '0s',
      color: 'text-accent-warning'
    },
    {
      icon: FaBolt,
      label: 'Fastest Solve',
      value: stats.fastest_solve_formatted || '0s',
      color: 'text-accent-success'
    }
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Overall Statistics
      </h2>
      
      {isDemo && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">Demo data - Sign up to track your real progress!</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <item.icon className={`text-2xl ${item.color}`} />
              <p className="text-text-tertiary text-sm">{item.label}</p>
            </div>
            <p className="text-text-primary font-bold text-2xl">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default OverallStatsCard;
