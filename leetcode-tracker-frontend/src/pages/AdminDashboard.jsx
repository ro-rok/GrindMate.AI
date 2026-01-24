import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import api from '../api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { FaUsers, FaCheckCircle, FaRobot, FaChartLine, FaUserCheck, FaCrown, FaLink } from 'react-icons/fa';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * AdminDashboard Component
 * Shows admin-only statistics and metrics
 * Only accessible by users with role="admin"
 */
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migratingSlug, setMigratingSlug] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!isAuthenticated) {
      toast.error('Please login to access admin dashboard');
      navigate('/login');
      return;
    }

    // Check if user email is admin (tutortherock17899@gmail.com)
    if (user?.email !== 'tutortherock17899@gmail.com') {
      toast.error('Admin access required');
      navigate('/');
      return;
    }

    fetchAdminStats();
  }, [isAuthenticated, user, navigate]);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/analytics/admin/dashboard');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      
      if (err.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/');
      } else {
        setError(err.response?.data?.detail || 'Failed to load admin dashboard');
        toast.error('Failed to load admin dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateSlugs = async () => {
    if (!confirm('This will add slugs to all companies and questions that don\'t have them. Continue?')) {
      return;
    }

    setMigratingSlug(true);
    
    try {
      const response = await api.post('/admin/migrate/slugs');
      
      toast.success(
        `Migration complete! Updated ${response.data.companies_updated} companies and ${response.data.questions_updated} questions.`,
        { duration: 5000 }
      );
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Migration errors:', response.data.errors);
        toast('Some items had errors. Check console for details.', { icon: '⚠️' });
      }
    } catch (err) {
      console.error('Failed to migrate slugs:', err);
      toast.error(err.response?.data?.detail || 'Failed to migrate slugs');
    } finally {
      setMigratingSlug(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-text-primary mb-8">Admin Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-20 bg-bg-secondary rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-text-primary mb-8">Admin Dashboard</h1>
          <Card className="p-6">
            <p className="text-accent-error mb-4">{error}</p>
            <button
              onClick={fetchAdminStats}
              className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
            >
              Retry
            </button>
          </Card>
        </div>
      </div>
    );
  }

  const overviewStats = [
    {
      icon: FaUsers,
      label: 'Total Users',
      value: stats?.total_users || 0,
      color: 'text-accent-primary'
    },
    {
      icon: FaCheckCircle,
      label: 'Questions Solved',
      value: stats?.total_questions_solved || 0,
      color: 'text-accent-success'
    },
    {
      icon: FaRobot,
      label: 'Tutor Sessions',
      value: stats?.total_tutor_sessions || 0,
      color: 'text-accent-warning'
    },
    {
      icon: FaChartLine,
      label: 'API Requests Today',
      value: stats?.total_api_requests_today || 0,
      color: 'text-blue-400'
    },
    {
      icon: FaUserCheck,
      label: 'Active Users Today',
      value: stats?.active_users_today || 0,
      color: 'text-green-400'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FaCrown className="text-3xl text-yellow-400" />
              <h1 className="text-4xl font-bold text-text-primary">Admin Dashboard</h1>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleMigrateSlugs}
              disabled={migratingSlug}
              className="flex items-center gap-2"
            >
              <FaLink />
              {migratingSlug ? 'Migrating...' : 'Generate URL Slugs'}
            </Button>
          </div>
          <p className="text-text-tertiary mb-8">
            System overview and user statistics
          </p>
        </motion.div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {overviewStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-lg bg-bg-secondary ${stat.color}`}>
                    <stat.icon className="text-3xl" />
                  </div>
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">{stat.label}</p>
                    <p className="text-text-primary font-bold text-3xl">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Top Users */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Top Users</h2>
            
            {stats?.top_users && stats.top_users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-3 px-4 text-text-tertiary font-semibold">Rank</th>
                      <th className="text-left py-3 px-4 text-text-tertiary font-semibold">Email</th>
                      <th className="text-center py-3 px-4 text-text-tertiary font-semibold">Questions Solved</th>
                      <th className="text-center py-3 px-4 text-text-tertiary font-semibold">Total Time</th>
                      <th className="text-center py-3 px-4 text-text-tertiary font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_users.map((user, index) => (
                      <motion.tr
                        key={user.email}
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.05 }}
                        className="border-b border-border-primary hover:bg-bg-secondary transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary font-bold text-lg">
                              #{index + 1}
                            </span>
                            {index === 0 && <span className="text-yellow-400">🏆</span>}
                            {index === 1 && <span className="text-gray-400">🥈</span>}
                            {index === 2 && <span className="text-orange-400">🥉</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary">{user.email}</span>
                            {user.is_admin && (
                              <Badge variant="warning" size="sm">
                                <FaCrown className="inline mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant="success" size="sm">
                            {user.questions_solved}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center text-text-secondary">
                          {user.total_time_formatted}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant={user.is_admin ? 'warning' : 'default'} size="sm">
                            {user.is_admin ? 'Admin' : 'User'}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-tertiary text-center py-8">No user data available</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default AdminDashboard;
