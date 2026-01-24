import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * TimeByTopicCard Component
 * Displays time spent breakdown by topic
 */
function TimeByTopicCard({ timeByTopic = [], isDemo = false }) {
  const prefersReducedMotion = useReducedMotion();

  if (!timeByTopic || timeByTopic.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Time by Topic
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
        Time by Topic
      </h2>
      
      {isDemo && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-400 text-sm">Demo data - Sign up to track your real progress!</p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {timeByTopic.map((item, index) => (
          <motion.div
            key={item.topic}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-text-primary font-medium">{item.topic}</h3>
              <Badge variant="default" size="sm">
                {item.questions_solved} solved
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary">Total Time</p>
                <p className="text-text-primary font-semibold">{item.total_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Avg Time</p>
                <p className="text-text-primary font-semibold">{item.avg_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Fastest</p>
                <p className="text-accent-success font-semibold">{item.fastest_time_formatted}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Slowest</p>
                <p className="text-accent-error font-semibold">{item.slowest_time_formatted}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default TimeByTopicCard;
