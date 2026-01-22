import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Profile page
 * User profile with statistics, settings, and account management
 * 
 * Features:
 * - User information display
 * - Solve statistics and achievements
 * - Account settings (timezone, preferences)
 * - BYOK API key management
 * - Progress reset
 * - Account deletion
 */
function Profile() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { showToast } = useUIStore();
  const prefersReducedMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [streak, setStreak] = useState(null);
  
  // Settings state
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [reducedMotion, setReducedMotion] = useState(user?.preferences?.reduced_motion || false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // BYOK state
  const [groqApiKey, setGroqApiKey] = useState('');
  const [savingByok, setSavingByok] = useState(false);
  const [byokEnabled, setByokEnabled] = useState(false);
  
  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, streakRes] = await Promise.all([
        api.get('/users/me/analytics'),
        api.get('/users/me/streak'),
      ]);
      
      setAnalytics(analyticsRes.data);
      setStreak(streakRes.data);
      
      // Check if BYOK is enabled
      if (analyticsRes.data.rate_budget) {
        setByokEnabled(analyticsRes.data.rate_budget.byok_enabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      
      await api.patch('/users/me', {
        timezone,
        preferences: {
          reduced_motion: reducedMotion,
          theme: 'dark'
        }
      });
      
      // Update local user state
      setUser({
        ...user,
        timezone,
        preferences: { reduced_motion: reducedMotion, theme: 'dark' }
      });
      
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveByok = async () => {
    if (!groqApiKey.trim()) {
      showToast('Please enter a valid API key', 'error');
      return;
    }

    try {
      setSavingByok(true);
      
      const response = await api.post('/users/me/byok', {
        groq_api_key: groqApiKey
      });
      
      setByokEnabled(response.data.byok_enabled);
      setGroqApiKey('');
      showToast('API key saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save BYOK key:', error);
      showToast('Failed to save API key', 'error');
    } finally {
      setSavingByok(false);
    }
  };

  const handleRemoveByok = async () => {
    try {
      setSavingByok(true);
      
      await api.delete('/users/me/byok');
      
      setByokEnabled(false);
      showToast('API key removed successfully', 'success');
    } catch (error) {
      console.error('Failed to remove BYOK key:', error);
      showToast('Failed to remove API key', 'error');
    } finally {
      setSavingByok(false);
    }
  };

  const handleResetProgress = async () => {
    try {
      setResetting(true);
      
      await api.post('/users/reset_progress');
      
      showToast('Progress reset successfully', 'success');
      setShowResetModal(false);
      
      // Refresh data
      await fetchProfileData();
    } catch (error) {
      console.error('Failed to reset progress:', error);
      showToast('Failed to reset progress', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      
      await api.delete('/users/me');
      
      showToast('Account deleted successfully', 'success');
      logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      showToast('Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black-base flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const solveStats = analytics?.solve_stats || {};
  const rateLimit = analytics?.rate_budget || {};

  return (
    <div className="min-h-screen bg-black-base p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-50">Profile</h1>
          <p className="text-gray-400 mt-2">Manage your account and view your progress</p>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-50">Account Information</h2>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-gray-50">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Role:</span>
                    <Badge variant={user?.role === 'admin' ? 'success' : 'default'}>
                      {user?.role || 'user'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Timezone:</span>
                    <span className="text-gray-50">{user?.timezone || 'UTC'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Statistics Grid */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Total Solved */}
          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Total Solved</div>
            <div className="text-3xl font-bold text-gray-50">{solveStats.total_solved || 0}</div>
          </Card>

          {/* Current Streak */}
          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Current Streak</div>
            <div className="text-3xl font-bold text-accent-primary flex items-center gap-2">
              🔥 {streak?.current_streak || 0}
            </div>
          </Card>

          {/* Longest Streak */}
          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Longest Streak</div>
            <div className="text-3xl font-bold text-accent-success">{streak?.longest_streak || 0}</div>
          </Card>

          {/* Solve Rate */}
          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Recent Solve Rate</div>
            <div className="text-3xl font-bold text-gray-50">
              {solveStats.solve_rate_last_10 ? `${(solveStats.solve_rate_last_10 * 100).toFixed(0)}%` : '0%'}
            </div>
          </Card>
        </motion.div>

        {/* Difficulty Breakdown */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-50 mb-4">Difficulty Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-black-base rounded-lg">
                <span className="text-gray-400">Easy</span>
                <span className="text-2xl font-bold text-accent-success">
                  {solveStats.by_difficulty?.EASY || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black-base rounded-lg">
                <span className="text-gray-400">Medium</span>
                <span className="text-2xl font-bold text-accent-warning">
                  {solveStats.by_difficulty?.MEDIUM || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black-base rounded-lg">
                <span className="text-gray-400">Hard</span>
                <span className="text-2xl font-bold text-accent-danger">
                  {solveStats.by_difficulty?.HARD || 0}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-50 mb-4">Settings</h2>
            <div className="space-y-4">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 bg-black-base border border-border-subtle rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                  <option value="Asia/Kolkata">India</option>
                </select>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-50">
                    Reduce Motion
                  </label>
                  <p className="text-sm text-gray-400 mt-1">
                    Minimize animations for better accessibility
                  </p>
                </div>
                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reducedMotion ? 'bg-accent-primary' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reducedMotion ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <Button
                onClick={handleSaveSettings}
                loading={savingSettings}
                className="w-full md:w-auto"
              >
                Save Settings
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* BYOK API Key */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-50 mb-2">Bring Your Own Key (BYOK)</h2>
            <p className="text-sm text-gray-400 mb-4">
              Use your own Groq API key for unlimited AI tutor access
            </p>
            
            {byokEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-green-400">✓</span>
                  <span className="text-green-400">BYOK enabled - Using your API key</span>
                </div>
                <Button
                  variant="danger"
                  onClick={handleRemoveByok}
                  loading={savingByok}
                >
                  Remove API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-gray-300">
                    Rate Limit: {rateLimit.tokens_remaining || 0} tokens, {rateLimit.requests_remaining || 0} requests remaining
                  </p>
                </div>
                <Input
                  type="password"
                  placeholder="Enter your Groq API key"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                />
                <Button
                  onClick={handleSaveByok}
                  loading={savingByok}
                >
                  Save API Key
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="p-6 border-accent-danger">
            <h2 className="text-xl font-semibold text-accent-danger mb-4">Danger Zone</h2>
            <div className="space-y-4">
              {/* Reset Progress */}
              <div className="flex items-center justify-between p-4 bg-black-base rounded-lg">
                <div>
                  <h3 className="text-gray-50 font-medium">Reset Progress</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Clear all solved questions and reset your streak
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setShowResetModal(true)}
                >
                  Reset
                </Button>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between p-4 bg-black-base rounded-lg">
                <div>
                  <h3 className="text-gray-50 font-medium">Delete Account</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Reset Progress Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetProgress}
        title="Reset Progress"
        message="Are you sure you want to reset all your progress? This will clear all solved questions and reset your streak. This action cannot be undone."
        confirmText="Reset Progress"
        confirmVariant="danger"
        loading={resetting}
      />

      {/* Delete Account Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will permanently delete all your data including solved questions, streaks, and settings. This action cannot be undone."
        confirmText="Delete Account"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}

export default Profile;
