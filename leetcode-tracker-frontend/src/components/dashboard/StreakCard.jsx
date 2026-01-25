import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * StreakCard component
 * Displays current streak with flame icon, longest streak, and calendar heatmap
 * Supports demo mode for anonymous users
 * 
 * Requirements: 4.3, 10.1-10.7
 */
const StreakCard = ({ 
  currentStreak = 0, 
  longestStreak = 0, 
  calendarHeatmap = [],
  onMilestone,
  isDemo = false,
  cardVariant = 'matte'
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(currentStreak);

  // Check for milestone achievements
  useEffect(() => {
    const milestones = [7, 30, 100];
    const reachedMilestone = milestones.find(m => 
      currentStreak >= m && previousStreak < m
    );

    if (reachedMilestone && currentStreak > previousStreak) {
      setShowConfetti(true);
      onMilestone?.(reachedMilestone);
      
      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setPreviousStreak(currentStreak);
  }, [currentStreak, previousStreak, onMilestone]);

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10,
    rotation: Math.random() * 360,
    color: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]
  }));

  return (
    <Card variant={cardVariant} className="p-6 relative overflow-hidden">
      {/* Demo mode badge */}
      {isDemo && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
          Demo
        </div>
      )}

      {/* Confetti animation */}
      {showConfetti && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: particle.color,
                left: `${particle.x}%`,
              }}
              initial={{ y: -10, opacity: 1, rotate: 0 }}
              animate={{
                y: ['0%', '120%'],
                opacity: [1, 1, 0],
                rotate: particle.rotation,
              }}
              transition={{
                duration: 2 + Math.random(),
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Daily Streak
          </h3>
          <p className="text-sm text-text-secondary">
            Keep the momentum going!
          </p>
        </div>
        
        {/* Flame icon */}
        <motion.div
          className="text-4xl"
          animate={
            prefersReducedMotion
              ? {}
              : currentStreak > 0
              ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          {currentStreak > 0 ? '🔥' : '💤'}
        </motion.div>
      </div>

      {/* Current streak display */}
      <motion.div
        className="mb-4"
        animate={
          prefersReducedMotion
            ? {}
            : showConfetti
            ? {
                scale: [1, 1.2, 1],
              }
            : {}
        }
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="text-5xl font-bold text-accent-primary mb-2">
          {currentStreak}
          <span className="text-2xl text-text-secondary ml-2">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
        <div className="text-sm text-text-secondary">
          Longest streak: <span className="text-text-primary font-medium">{longestStreak} days</span>
        </div>
      </motion.div>

      {/* Calendar heatmap */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-text-secondary mb-3">
          Last 30 days
        </h4>
        <div className="grid grid-cols-10 gap-1.5">
          {calendarHeatmap.map((day, index) => {
            const count = day.count || 0;
            const intensity = count === 0 ? 0 : Math.min(count / 3, 1);
            
            return (
              <motion.div
                key={day.date || index}
                className="aspect-square rounded-sm cursor-pointer group relative"
                style={{
                  backgroundColor: count === 0 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : `rgba(14, 165, 233, ${0.3 + intensity * 0.7})`,
                }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.2 }}
                transition={{ duration: 0.15 }}
                title={`${day.date}: ${count} ${count === 1 ? 'solve' : 'solves'}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black-elevated border border-border-subtle rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  {day.date}: {count} {count === 1 ? 'solve' : 'solves'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Milestone badges */}
      {currentStreak >= 7 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {currentStreak >= 7 && (
            <span className="px-2 py-1 text-xs font-medium bg-accent-success/20 text-accent-success border border-accent-success/30 rounded-full">
              🏆 Week Warrior
            </span>
          )}
          {currentStreak >= 30 && (
            <span className="px-2 py-1 text-xs font-medium bg-accent-primary/20 text-accent-primary border border-accent-primary/30 rounded-full">
              👑 Month Master
            </span>
          )}
          {currentStreak >= 100 && (
            <span className="px-2 py-1 text-xs font-medium bg-accent-warning/20 text-accent-warning border border-accent-warning/30 rounded-full">
              💯 Century Club
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

export default StreakCard;
