import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * CalendarHeatmapCard component
 * Displays 30-day calendar heatmap of solve activity
 * Supports demo mode for anonymous users
 * 
 * Requirements: 4.4
 */
const CalendarHeatmapCard = ({ 
  heatmapData = [],
  isDemo = false,
  cardVariant = 'matte'
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Generate 30 days of data if not provided
  const generateDefaultHeatmap = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        count: 0
      });
    }
    return days;
  };

  const heatmap = heatmapData.length > 0 ? heatmapData : generateDefaultHeatmap();
  
  // Calculate stats
  const totalSolves = heatmap.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = heatmap.filter(day => day.count > 0).length;
  const maxCount = Math.max(...heatmap.map(day => day.count || 0), 1);

  // Get intensity color
  const getIntensityColor = (count) => {
    if (count === 0) return 'rgba(255, 255, 255, 0.05)';
    const intensity = Math.min(count / maxCount, 1);
    return `rgba(14, 165, 233, ${0.3 + intensity * 0.7})`;
  };

  // Format date for tooltip
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
            Activity Calendar
          </h3>
          <p className="text-sm text-text-secondary">
            Last 30 days of solving activity
          </p>
        </div>
        
        {/* Stats icon */}
        <div className="text-2xl">📅</div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-accent-primary mb-1">
            {totalSolves}
          </div>
          <div className="text-xs text-text-secondary">
            Total Solves
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-accent-success mb-1">
            {activeDays}
          </div>
          <div className="text-xs text-text-secondary">
            Active Days
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-text-secondary">
            Daily Activity
          </h4>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.3)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.6)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 1)' }} />
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-1.5">
          {heatmap.map((day, index) => {
            const count = day.count || 0;
            
            return (
              <motion.div
                key={day.date || index}
                className="aspect-square rounded-sm cursor-pointer group relative"
                style={{
                  backgroundColor: getIntensityColor(count),
                }}
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.01 }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.2 }}
                title={`${formatDate(day.date)}: ${count} ${count === 1 ? 'solve' : 'solves'}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black-elevated border border-border-subtle rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  {formatDate(day.date)}: {count} {count === 1 ? 'solve' : 'solves'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer message */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <p className="text-xs text-text-secondary text-center">
          {activeDays === 0 
            ? 'Start solving to build your activity streak'
            : `You've been active ${activeDays} out of 30 days`
          }
        </p>
      </div>
    </Card>
  );
};

export default CalendarHeatmapCard;
