import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import api from '../api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getCompanyIdentifier } from '../utils/slugify';
import StreakCard from '../components/dashboard/StreakCard';
import WeakTopicsCard from '../components/dashboard/WeakTopicsCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { SmartRandomButton } from '../components/question';

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * Dashboard page
 * Main hub with streak, weak topics, quick actions, and recent activity
 * 
 * Requirements: 10.1-10.7, 11.1-11.7
 */
function Dashboard() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [streak, setStreak] = useState(null);
  
  const heroRef = useRef(null);
  const cardsRef = useRef(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch analytics and streak data
        const [analyticsRes, streakRes] = await Promise.all([
          api.get('/users/me/analytics'),
          api.get('/users/me/streak'),
        ]);
        
        setAnalytics(analyticsRes.data);
        setStreak(streakRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        
        // If we get a 401, the session is invalid - redirect to login
        if (error.response?.status === 401) {
          useAuthStore.getState().setUser(null);
          navigate('/login');
        } else {
          showToast('Failed to load dashboard data', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast, navigate]);

  // GSAP scroll animations
  useEffect(() => {
    if (prefersReducedMotion || loading) return;

    const ctx = gsap.context(() => {
      // Hero section fade in
      gsap.from(heroRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power2.out',
      });

      // Cards stagger animation
      gsap.from('.dashboard-card', {
        scrollTrigger: {
          trigger: cardsRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.6,
        ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, [prefersReducedMotion, loading]);

  // Handle milestone celebration
  const handleMilestone = (days) => {
    const messages = {
      7: '🎉 Week Warrior! 7 day streak achieved!',
      30: '👑 Month Master! 30 day streak achieved!',
      100: '💯 Century Club! 100 day streak achieved!',
    };
    
    showToast(messages[days] || `${days} day streak!`, 'success', 8000);
  };

  // Handle weak topic click
  const handleTopicClick = (topic) => {
    // Navigate to question list with topic filter
    navigate(`/companies?topics=${encodeURIComponent(topic)}`);
  };

  // Handle random question
  const handleRandomQuestion = async () => {
    try {
      // Get a random company from favorites or all companies
      const response = await fetch(`${import.meta.env.VITE_API_URL}/companies`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const companies = await response.json();
      
      if (companies.length === 0) {
        showToast('No companies available', 'error');
        return;
      }
      
      // Pick a random company
      const randomCompany = companies[Math.floor(Math.random() * companies.length)];
      
      // Navigate to that company's questions page using slug
      navigate(`/companies/${getCompanyIdentifier(randomCompany)}`);
    } catch (error) {
      console.error('Failed to get random company:', error);
      showToast('Failed to get random question', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black-base flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero section */}
        <div ref={heroRef}>
          <header>
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
            </h1>
            <p className="text-lg text-text-secondary">
              Ready to crush some problems today?
            </p>
          </header>
        </div>

        {/* Main content grid */}
        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" role="region" aria-label="Dashboard overview">
          {/* Streak card - spans 2 columns on large screens */}
          <div className="lg:col-span-2 dashboard-card">
            <StreakCard
              currentStreak={streak?.current_streak || 0}
              longestStreak={streak?.longest_streak || 0}
              calendarHeatmap={streak?.calendar_heatmap || []}
              onMilestone={handleMilestone}
            />
          </div>

          {/* Quick actions */}
          <div className="dashboard-card">
            <Card className="p-6 h-full">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Quick Actions
              </h3>
              <nav aria-label="Quick actions">
                <div className="space-y-3">
                  <SmartRandomButton
                    variant="primary"
                    className="w-full"
                    showToggle={true}
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleRandomQuestion}
                    aria-label="Get a random question (legacy)"
                  >
                    🎲 Random Question (Legacy)
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate('/companies')}
                    aria-label="Browse companies and their questions"
                  >
                    📚 Browse Companies
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/analytics')}
                    aria-label="View your analytics and progress"
                  >
                    📊 View Analytics
                  </Button>
                </div>
              </nav>
            </Card>
          </div>
        </div>

        {/* Weak topics and stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weak topics */}
          <div className="dashboard-card">
            <WeakTopicsCard
              weakTopics={analytics?.weak_topics || []}
              onTopicClick={handleTopicClick}
            />
          </div>

          {/* Solve stats */}
          <div className="dashboard-card">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Solve Statistics
              </h3>
              
              {/* Total solved */}
              <div className="mb-6">
                <div className="text-4xl font-bold text-accent-primary mb-1" aria-label={`${analytics?.solve_stats?.total_solved || 0} total problems solved`}>
                  {analytics?.solve_stats?.total_solved || 0}
                </div>
                <div className="text-sm text-text-secondary">
                  Total problems solved
                </div>
              </div>

              {/* By difficulty */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-text-secondary">
                  By Difficulty
                </h4>
                {['EASY', 'MEDIUM', 'HARD'].map((difficulty) => {
                  const count = analytics?.solve_stats?.by_difficulty?.[difficulty] || 0;
                  const variant = Badge.getDifficultyVariant(difficulty);
                  
                  return (
                    <div key={difficulty} className="flex items-center justify-between">
                      <Badge variant={variant}>{difficulty}</Badge>
                      <span className="text-text-primary font-medium" aria-label={`${count} ${difficulty.toLowerCase()} problems solved`}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Recent solve rate */}
              <div className="pt-4 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Recent solve rate (last 10)
                  </span>
                  <span className="text-lg font-semibold text-accent-primary" aria-label={`${Math.round((analytics?.solve_stats?.solve_rate_last_10 || 0) * 100)} percent solve rate`}>
                    {Math.round((analytics?.solve_stats?.solve_rate_last_10 || 0) * 100)}%
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Pattern distribution */}
        {analytics?.pattern_distribution && Object.keys(analytics.pattern_distribution).length > 0 && (
          <div className="dashboard-card">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Pattern Distribution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Pattern distribution">
                {Object.entries(analytics.pattern_distribution)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .slice(0, 9)
                  .map(([pattern, stats]) => {
                    const solveRate = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
                    
                    return (
                      <div
                        key={pattern}
                        className="p-3 bg-black-elevated-hover rounded-lg border border-border-subtle"
                        role="listitem"
                      >
                        <div className="text-sm font-medium text-text-primary mb-2 capitalize">
                          {pattern.replace(/-/g, ' ')}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary" aria-label={`${stats.solved} out of ${stats.total} solved`}>
                            {stats.solved}/{stats.total}
                          </span>
                          <span className={`font-semibold ${
                            solveRate >= 70 ? 'text-accent-success' :
                            solveRate >= 50 ? 'text-accent-warning' :
                            'text-accent-danger'
                          }`} aria-label={`${Math.round(solveRate)} percent solve rate`}>
                            {Math.round(solveRate)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(solveRate)} aria-valuemin="0" aria-valuemax="100" aria-label={`${pattern} progress`}>
                          <motion.div
                            className={`h-full rounded-full ${
                              solveRate >= 70 ? 'bg-accent-success' :
                              solveRate >= 50 ? 'bg-accent-warning' :
                              'bg-accent-danger'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${solveRate}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}

        {/* Rate budget info */}
        {analytics?.rate_budget && (
          <div className="dashboard-card mt-6">
            <Card className="p-4 bg-black-elevated-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">🤖</span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      AI Tutor Budget
                    </div>
                    <div className="text-xs text-text-secondary">
                      Resets daily at midnight
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-accent-primary" aria-label={`${analytics.rate_budget.tokens_remaining.toLocaleString()} tokens remaining`}>
                    {analytics.rate_budget.tokens_remaining.toLocaleString()} tokens
                  </div>
                  <div className="text-xs text-text-secondary" aria-label={`${analytics.rate_budget.requests_remaining} requests remaining`}>
                    {analytics.rate_budget.requests_remaining} requests left
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
