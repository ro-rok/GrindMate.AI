import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * WeakTopicsCard component
 * Displays weak topics with solve rate bars and practice CTAs
 * 
 * Requirements: 11.1-11.7
 */
const WeakTopicsCard = ({ 
  weakTopics = [], 
  onTopicClick 
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [newWeakTopics, setNewWeakTopics] = useState(new Set());
  const [previousTopics, setPreviousTopics] = useState([]);

  // Detect new weak topics for pulse animation
  useEffect(() => {
    const previousTopicNames = new Set(previousTopics.map(t => t.topic));
    const currentTopicNames = new Set(weakTopics.map(t => t.topic));
    
    const newTopics = weakTopics
      .filter(t => !previousTopicNames.has(t.topic))
      .map(t => t.topic);
    
    if (newTopics.length > 0) {
      setNewWeakTopics(new Set(newTopics));
      
      // Remove pulse after 3 seconds
      setTimeout(() => {
        setNewWeakTopics(new Set());
      }, 3000);
    }
    
    setPreviousTopics(weakTopics);
  }, [weakTopics]);

  // Empty state
  if (weakTopics.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Weak Topics
            </h3>
            <p className="text-sm text-text-secondary">
              Topics where you need more practice
            </p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-text-primary font-medium mb-1">
            No weak topics detected!
          </p>
          <p className="text-sm text-text-secondary">
            Keep solving problems to track your progress
          </p>
        </div>
      </Card>
    );
  }

  // Sort topics by solve rate (weakest first)
  const sortedTopics = [...weakTopics].sort((a, b) => a.solve_rate - b.solve_rate);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Weak Topics
          </h3>
          <p className="text-sm text-text-secondary">
            Topics where you need more practice
          </p>
        </div>
        
        {/* Warning icon */}
        <div className="text-2xl">⚠️</div>
      </div>

      <div className="space-y-4">
        {sortedTopics.map((topic, index) => {
          const solveRatePercent = Math.round(topic.solve_rate * 100);
          const isVeryWeak = topic.solve_rate < 0.3;
          const isNew = newWeakTopics.has(topic.topic);
          
          return (
            <motion.div
              key={topic.topic}
              className="relative"
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : isNew
                  ? {
                      opacity: 1,
                      x: 0,
                      scale: [1, 1.05, 1],
                    }
                  : { opacity: 1, x: 0 }
              }
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                scale: {
                  duration: 0.6,
                  repeat: isNew ? 3 : 0,
                  repeatType: 'loop',
                },
              }}
            >
              {/* Topic header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isVeryWeak && (
                    <span className="text-accent-danger text-sm">🚨</span>
                  )}
                  <span className="text-sm font-medium text-text-primary capitalize">
                    {topic.topic.replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    {topic.solved}/{topic.attempts} solved
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isVeryWeak
                        ? 'text-accent-danger'
                        : 'text-accent-warning'
                    }`}
                  >
                    {solveRatePercent}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    isVeryWeak
                      ? 'bg-accent-danger'
                      : 'bg-accent-warning'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${solveRatePercent}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>

              {/* Practice CTA */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-accent-primary hover:bg-accent-primary/10"
                onClick={() => onTopicClick?.(topic.topic)}
              >
                Practice now →
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <p className="text-xs text-text-secondary text-center">
          Focus on these topics to improve your overall performance
        </p>
      </div>
    </Card>
  );
};

export default WeakTopicsCard;
