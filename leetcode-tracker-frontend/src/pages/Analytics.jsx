import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../api';
import useAuthStore from '../store/authStore';
import StreakCard from '../components/dashboard/StreakCard';
import WeakTopicsCard from '../components/dashboard/WeakTopicsCard';
import DifficultyBreakdownCard from '../components/dashboard/DifficultyBreakdownCard';
import CalendarHeatmapCard from '../components/dashboard/CalendarHeatmapCard';
import AnalyticsSkeletonLoader from '../components/dashboard/AnalyticsSkeletonLoader';
import ErrorState from '../components/dashboard/ErrorState';
import { motionVariants, motionTransitions } from '../utils/motion';
import { fadeInOnScroll } from '../utils/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Analytics page
 * Displays user analytics with auth state check
 * Shows demo data for anonymous users with CTA to sign up
 * Fetches real data for authenticated users
 * Handles API errors gracefully with retry
 * Adds reveal animations with GSAP
 * 
 **/
function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const cardsRef = useRef([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    } else {
      // Show demo data for anonymous users immediately
      setAnalytics(getDemoAnalytics());
      setStreak(getDemoStreak());
      setLoading(false);
    }
  }, [isAuthenticated]);

  // GSAP reveal animations after data loads
  useEffect(() => {
    if (!loading && !error && cardsRef.current.length > 0 && !prefersReducedMotion) {
      cardsRef.current.forEach((card, index) => {
        if (card) {
          fadeInOnScroll(card, {
            delay: index * 0.1,
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
            },
          });
        }
      });
    }
  }, [loading, error, prefersReducedMotion]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch analytics and streak data in parallel
      const [analyticsRes, streakRes] = await Promise.all([
        api.get('/users/me/analytics'),
        api.get('/users/me/streak'),
      ]);
      
      setAnalytics(analyticsRes.data);
      setStreak(streakRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      
      // If we get a 401, the session is invalid - update auth state
      if (err.response?.status === 401) {
        useAuthStore.getState().setUser(null);
        // Show demo data instead
        setAnalytics(getDemoAnalytics());
        setStreak(getDemoStreak());
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    // Navigate to questions page with topic filter
    navigate(`/questions?topic=${encodeURIComponent(topic)}`);
  };

  // Show skeleton loader while loading
  if (loading) {
    return <AnalyticsSkeletonLoader />;
  }

  // Show error state with retry
  if (error) {
    return <ErrorState error={error} onRetry={fetchAnalytics} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={prefersReducedMotion ? {} : "initial"}
        animate="animate"
        variants={motionVariants.fadeInUp}
        transition={motionTransitions.normal}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Analytics</h1>
          <p className="text-base text-[var(--text-secondary)]">
            Track your progress and identify areas for improvement
          </p>
        </header>

        {/* Anonymous user CTA */}
        {!isAuthenticated && (
          <motion.div
            className="mb-6 p-4 bg-[var(--accent-primary-light)] border border-[var(--border-brand)] rounded-[var(--radius-lg)]"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            role="alert"
          >
            <p className="text-[var(--accent-primary)] mb-3 text-sm">
              You're viewing demo analytics. Sign up to track your real progress!
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              aria-label="Sign up or login to track your progress"
            >
              Sign Up / Login
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Analytics cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" role="region" aria-label="Analytics dashboard">
        <div ref={(el) => (cardsRef.current[0] = el)}>
          <StreakCard
            currentStreak={streak?.current_streak || 0}
            longestStreak={streak?.longest_streak || 0}
            calendarHeatmap={analytics?.heatmap || []}
            isDemo={!isAuthenticated}
            cardVariant="glass"
          />
        </div>

        <div ref={(el) => (cardsRef.current[1] = el)}>
          <DifficultyBreakdownCard
            difficultyBreakdown={analytics?.difficulty_breakdown || { EASY: 0, MEDIUM: 0, HARD: 0 }}
            isDemo={!isAuthenticated}
            cardVariant="glass"
          />
        </div>

        <div ref={(el) => (cardsRef.current[2] = el)}>
          <CalendarHeatmapCard
            heatmapData={analytics?.heatmap || []}
            isDemo={!isAuthenticated}
            cardVariant="glass"
          />
        </div>

        <div ref={(el) => (cardsRef.current[3] = el)}>
          <WeakTopicsCard
            weakTopics={analytics?.weak_topics || []}
            onTopicClick={handleTopicClick}
            isDemo={!isAuthenticated}
            cardVariant="glass"
          />
        </div>
      </div>
    </div>
  );
}

// Demo data functions for anonymous users
function getDemoAnalytics() {
  return {
    weak_topics: [
      { topic: 'dynamic-programming', solve_rate: 0.4, attempts: 10, solved: 4 },
      { topic: 'graph-algorithms', solve_rate: 0.45, attempts: 8, solved: 3 },
      { topic: 'backtracking', solve_rate: 0.5, attempts: 6, solved: 3 },
    ],
    weak_patterns: [
      { topic: 'sliding-window', solve_rate: 0.35, attempts: 12, solved: 4 },
      { topic: 'two-pointers', solve_rate: 0.42, attempts: 9, solved: 4 },
    ],
    difficulty_breakdown: { EASY: 15, MEDIUM: 8, HARD: 2 },
    heatmap: generateDemoHeatmap(),
  };
}

function getDemoStreak() {
  return {
    current_streak: 5,
    longest_streak: 12,
    last_solve_date: new Date().toISOString(),
  };
}

function generateDemoHeatmap() {
  const days = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate random solve counts with some pattern
    let count = 0;
    if (i < 5) {
      // Recent days have higher activity
      count = Math.floor(Math.random() * 4);
    } else if (i < 15) {
      count = Math.floor(Math.random() * 3);
    } else {
      count = Math.floor(Math.random() * 2);
    }
    
    days.push({
      date: date.toISOString().split('T')[0],
      count: count,
    });
  }
  
  return days;
}

export default Analytics;
