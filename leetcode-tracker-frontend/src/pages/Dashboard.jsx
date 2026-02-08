import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import api from '../api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { usePageTitle } from '../hooks/usePageTitle';
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
  
  // Set page title
  usePageTitle('Dashboard');
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [streak, setStreak] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  
  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const fetchingDataRef = useRef(false);

  // Fetch analytics data
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingDataRef.current) return;
    
    const fetchData = async () => {
      fetchingDataRef.current = true;
      try {
        setLoading(true);
        
        // Fetch analytics and streak data
        const [analyticsRes, streakRes, recentCompaniesRes] = await Promise.all([
          api.get('/users/me/analytics'),
          api.get('/users/me/streak'),
          api.get('/analytics/user/recent-solved-companies?limit=5'),
        ]);
        
        setAnalytics(analyticsRes.data);
        setStreak(streakRes.data);
        setRecentCompanies(recentCompaniesRes.data);
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
        fetchingDataRef.current = false;
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only fetch once on mount

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

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format last active time
  const formatLastActive = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-[var(--space-4)]"></div>
          <p className="text-[var(--text-secondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Today Strip - Action-first */}
        <div ref={heroRef} className="mb-[var(--space-4)]">
          <div className="flex items-center justify-between mb-[var(--space-4)]">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-[var(--space-0_5)]">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
              </h1>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/companies')}
              className="font-semibold"
            >
              Start Focus Session →
            </Button>
          </div>
          
          {/* Today Metrics Strip */}
          <div className="flex items-center gap-[var(--space-4)] flex-wrap p-[var(--space-3)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="text-xs text-[var(--text-tertiary)]">Streak:</span>
              <span className="text-sm font-semibold text-[var(--accent-primary)]">
                {streak?.current_streak || 0} days
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="text-xs text-[var(--text-tertiary)]">Solved today:</span>
              <span className="text-sm font-semibold text-[var(--accent-success)]">
                {analytics?.solve_stats?.solved_today || 0}
              </span>
            </div>
            {analytics?.solve_stats?.time_spent_today_seconds !== undefined && (
              <>
                <div className="w-px h-4 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-[var(--space-2)]">
                  <span className="text-xs text-[var(--text-tertiary)]">Time today:</span>
                  <span className="text-sm font-semibold text-[var(--accent-primary)]">
                    {formatTime(analytics.solve_stats.time_spent_today_seconds)}
                  </span>
                </div>
              </>
            )}
            {analytics?.next_recommended && (
              <>
                <div className="w-px h-4 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-[var(--space-2)]">
                  <span className="text-xs text-[var(--text-tertiary)]">Next:</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                    {analytics.next_recommended.title}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-4)] mb-[var(--space-6)]" role="region" aria-label="Dashboard overview">
          {/* Streak card - spans 2 columns on large screens */}
          <div className="lg:col-span-2 dashboard-card">
            <StreakCard
              currentStreak={streak?.current_streak || 0}
              longestStreak={streak?.longest_streak || 0}
              calendarHeatmap={streak?.calendar_heatmap || []}
              onMilestone={handleMilestone}
            />
          </div>

          {/* Quick actions - Structured panel */}
          <div className="dashboard-card">
            <Card className="p-[var(--space-4)] h-full">
              <Card.Header className="p-0 pb-[var(--space-3)]">
                <Card.Title className="text-base">Quick Actions</Card.Title>
              </Card.Header>
              <nav aria-label="Quick actions">
                <div className="space-y-[var(--space-2)]">
                  <SmartRandomButton
                    variant="primary"
                    className="w-full text-sm"
                    showToggle={true}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate('/companies')}
                    aria-label="Browse companies and their questions"
                  >
                    <span className="mr-[var(--space-2)]">📚</span>
                    Browse Companies
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">Ctrl+K</span>
                  </Button>
                </div>
              </nav>
            </Card>
          </div>
        </div>

        {/* Weak topics and stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Weak topics */}
          <div className="dashboard-card">
            <WeakTopicsCard
              weakTopics={analytics?.weak_topics || []}
              onTopicClick={handleTopicClick}
            />
          </div>

          {/* Solve stats */}
          <div className="dashboard-card">
            <Card className="p-[var(--space-4)]">
              <Card.Header className="p-0 pb-[var(--space-3)]">
                <Card.Title className="text-base">Solve Statistics</Card.Title>
              </Card.Header>
              
              {/* Total solved */}
              <div className="mb-5">
                <div className="text-3xl font-bold text-[var(--accent-primary)] mb-1" aria-label={`${analytics?.solve_stats?.total_solved || 0} total problems solved`}>
                  {analytics?.solve_stats?.total_solved || 0}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Total problems solved
                </div>
              </div>

              {/* By difficulty */}
              <div className="space-y-2.5 mb-5">
                <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                  By Difficulty
                </h4>
                {['EASY', 'MEDIUM', 'HARD'].map((difficulty) => {
                  const count = analytics?.solve_stats?.by_difficulty?.[difficulty] || 0;
                  const variant = Badge.getDifficultyVariant(difficulty);
                  
                  return (
                    <div key={difficulty} className="flex items-center justify-between">
                      <Badge variant={variant} size="sm">{difficulty}</Badge>
                      <span className="text-[var(--text-primary)] font-medium text-sm" aria-label={`${count} ${difficulty.toLowerCase()} problems solved`}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Recent solve rate */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Recent solve rate (last 10)
                  </span>
                  <span className="text-base font-semibold text-[var(--accent-primary)]" aria-label={`${Math.round((analytics?.solve_stats?.solve_rate_last_10 || 0) * 100)} percent solve rate`}>
                    {Math.round((analytics?.solve_stats?.solve_rate_last_10 || 0) * 100)}%
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Solved Companies */}
        {recentCompanies && recentCompanies.length > 0 && (
          <div className="dashboard-card mb-6">
            <Card className="p-[var(--space-4)]">
              <Card.Header className="p-0 pb-[var(--space-3)]">
                <Card.Title className="text-base">Recent Solved Companies</Card.Title>
              </Card.Header>
              <div className="space-y-[var(--space-2)]">
                {recentCompanies.map((company) => {
                  const solvePercentage = company.total_questions > 0 
                    ? Math.round((company.questions_solved / company.total_questions) * 100) 
                    : 0;
                  const companySlug = company.company_slug || company.company_id;
                  
                  return (
                    <button
                      key={company.company_id}
                      onClick={() => navigate(`/companies/${companySlug}`)}
                      className="w-full p-[var(--space-3)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-brand)] rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] text-left group"
                    >
                      <div className="flex items-center justify-between mb-[var(--space-2)]">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                            {company.company_name}
                          </h4>
                          <p className="text-xs text-[var(--text-tertiary)] mt-[var(--space-0_5)]">
                            Last solved {new Date(company.last_solved_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-[var(--space-3)]">
                          <div className="text-sm font-semibold text-[var(--accent-primary)]">
                            {company.questions_solved}/{company.total_questions}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {solvePercentage}%
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--accent-primary)] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${solvePercentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Pattern distribution */}
        {analytics?.pattern_distribution && Object.keys(analytics.pattern_distribution).length > 0 && (
          <div className="dashboard-card">
            <Card className="p-5">
              <Card.Header className="p-0 pb-4">
                <Card.Title>Pattern Distribution</Card.Title>
              </Card.Header>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list" aria-label="Pattern distribution">
                {Object.entries(analytics.pattern_distribution)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .slice(0, 9)
                  .map(([pattern, stats]) => {
                    const solveRate = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
                    
                    return (
                      <div
                        key={pattern}
                        className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
                        role="listitem"
                      >
                        <div className="text-sm font-medium text-[var(--text-primary)] mb-2 capitalize">
                          {pattern.replace(/-/g, ' ')}
                        </div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-[var(--text-secondary)]" aria-label={`${stats.solved} out of ${stats.total} solved`}>
                            {stats.solved}/{stats.total}
                          </span>
                          <span className={`font-semibold ${
                            solveRate >= 70 ? 'text-[var(--accent-success)]' :
                            solveRate >= 50 ? 'text-[var(--accent-warning)]' :
                            'text-[var(--accent-danger)]'
                          }`} aria-label={`${Math.round(solveRate)} percent solve rate`}>
                            {Math.round(solveRate)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(solveRate)} aria-valuemin="0" aria-valuemax="100" aria-label={`${pattern} progress`}>
                          <motion.div
                            className={`h-full rounded-full ${
                              solveRate >= 70 ? 'bg-[var(--accent-success)]' :
                              solveRate >= 50 ? 'bg-[var(--accent-warning)]' :
                              'bg-[var(--accent-danger)]'
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
          <div className="dashboard-card mt-4">
            <Card className="p-4 bg-[var(--bg-surface-2)] border-[var(--border-brand)]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">🤖</span>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      AI Tutor Budget
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Resets daily at midnight
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[var(--accent-primary)]" aria-label={`${analytics.rate_budget.tokens_remaining.toLocaleString()} tokens remaining`}>
                    {analytics.rate_budget.tokens_remaining.toLocaleString()} tokens
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]" aria-label={`${analytics.rate_budget.requests_remaining} requests remaining`}>
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
