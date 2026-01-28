import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import toast from '../utils/toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TutorSessionHistory from '../components/tutor/TutorSessionHistory';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SECURITY_QUESTIONS, getSecurityQuestionById } from '../constants/securityQuestions';

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
  
  // Security question state
  const [securityQuestionId, setSecurityQuestionId] = useState(user?.security_question_id || '');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [savingSecurityQuestion, setSavingSecurityQuestion] = useState(false);
  
  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Reset progress state
  const [resetScope, setResetScope] = useState('all'); // 'all' or 'company'
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Update security question ID when user changes
  useEffect(() => {
    if (user?.security_question_id) {
      setSecurityQuestionId(user.security_question_id.toString());
    }
  }, [user?.security_question_id]);

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
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSecurityQuestion = async () => {
    if (!securityQuestionId) {
      toast.error('Please select a security question');
      return;
    }
    if (!securityAnswer.trim()) {
      toast.error('Please enter a security answer');
      return;
    }

    try {
      setSavingSecurityQuestion(true);
      
      await api.patch('/users/me', {
        security_question_id: parseInt(securityQuestionId),
        security_answer: securityAnswer,
      });
      
      // Update local user state
      setUser({
        ...user,
        security_question_id: parseInt(securityQuestionId),
      });
      
      setSecurityAnswer(''); // Clear answer for security
      toast.success('Security question updated successfully');
    } catch (error) {
      console.error('Failed to save security question:', error);
      toast.error(error.response?.data?.detail || 'Failed to save security question');
    } finally {
      setSavingSecurityQuestion(false);
    }
  };

  const handleSaveByok = async () => {
    if (!groqApiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    try {
      setSavingByok(true);
      
      const response = await api.post('/users/me/byok', {
        groq_api_key: groqApiKey
      });
      
      setByokEnabled(response.data.byok_enabled);
      setGroqApiKey('');
      toast.success('API key saved successfully');
    } catch (error) {
      console.error('Failed to save BYOK key:', error);
      toast.error('Failed to save API key');
    } finally {
      setSavingByok(false);
    }
  };

  const handleRemoveByok = async () => {
    try {
      setSavingByok(true);
      
      await api.delete('/users/me/byok');
      
      setByokEnabled(false);
      toast.success('API key removed successfully');
    } catch (error) {
      console.error('Failed to remove BYOK key:', error);
      toast.error('Failed to remove API key');
    } finally {
      setSavingByok(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await api.get('/companies');
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetScope('all');
    setSelectedCompanyId('');
    if (companies.length === 0) {
      fetchCompanies();
    }
    setShowResetModal(true);
  };

  const handleResetProgress = async () => {
    try {
      setResetting(true);
      
      const payload = {
        user_id: user?.id,
      };
      
      // Add company_id if resetting specific company
      if (resetScope === 'company' && selectedCompanyId) {
        payload.company_id = selectedCompanyId;
      }
      
      await api.post('/users/reset_progress', payload);
      
      toast.success(
        resetScope === 'all' 
          ? 'All progress reset successfully' 
          : 'Company progress reset successfully'
      );
      setShowResetModal(false);
      setResetScope('all');
      setSelectedCompanyId('');
      
      // Refresh data
      await fetchProfileData();
    } catch (error) {
      console.error('Failed to reset progress:', error);
      toast.error('Failed to reset progress');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      
      await api.delete('/users/me');
      
      toast.success('Account deleted successfully');
      logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const solveStats = analytics?.solve_stats || {};
  const rateLimit = analytics?.rate_budget || {};

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Profile</h1>
          <p className="text-[var(--text-secondary)] mt-2">Manage your account and view your progress</p>
        </motion.div>

        {/* Account Summary Card */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-5">
            <Card.Header className="p-0 pb-4">
              <Card.Title>Account Summary</Card.Title>
            </Card.Header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-tertiary)] mb-1">Email</div>
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.email}</div>
              </div>
              <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-tertiary)] mb-1">Role</div>
                <Badge variant={user?.role === 'admin' ? 'success' : 'default'} size="sm">
                  {user?.role || 'user'}
                </Badge>
              </div>
              <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-tertiary)] mb-1">Timezone</div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{user?.timezone || 'UTC'}</div>
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
          <Card className="p-5 hover:border-[var(--border-brand)] transition-colors">
            <div className="text-[var(--text-tertiary)] text-xs mb-1 uppercase tracking-wide">Total Solved</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{solveStats.total_solved || 0}</div>
          </Card>

          {/* Current Streak */}
          <Card className="p-5 hover:border-[var(--border-brand)] transition-colors">
            <div className="text-[var(--text-tertiary)] text-xs mb-1 uppercase tracking-wide">Current Streak</div>
            <div className="text-2xl font-bold text-[var(--accent-primary)] flex items-center gap-2">
              🔥 {streak?.current_streak || 0}
            </div>
          </Card>

          {/* Longest Streak */}
          <Card className="p-5 hover:border-[var(--border-brand)] transition-colors">
            <div className="text-[var(--text-tertiary)] text-xs mb-1 uppercase tracking-wide">Longest Streak</div>
            <div className="text-2xl font-bold text-[var(--accent-success)]">{streak?.longest_streak || 0}</div>
          </Card>

          {/* Solve Rate */}
          <Card className="p-5 hover:border-[var(--border-brand)] transition-colors">
            <div className="text-[var(--text-tertiary)] text-xs mb-1 uppercase tracking-wide">Recent Solve Rate</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
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
          <Card className="p-5">
            <Card.Header className="p-0 pb-4">
              <Card.Title>Difficulty Breakdown</Card.Title>
            </Card.Header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] text-sm">Easy</span>
                <span className="text-xl font-bold text-[var(--accent-success)]">
                  {solveStats.by_difficulty?.EASY || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] text-sm">Medium</span>
                <span className="text-xl font-bold text-[var(--accent-warning)]">
                  {solveStats.by_difficulty?.MEDIUM || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] text-sm">Hard</span>
                <span className="text-xl font-bold text-[var(--accent-danger)]">
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
          <Card className="p-5">
            <Card.Header className="p-0 pb-4">
              <Card.Title>Settings</Card.Title>
            </Card.Header>
            <div className="space-y-4">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
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
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Reduce Motion
                  </label>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Minimize animations for better accessibility
                  </p>
                </div>
                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reducedMotion ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface-2)]'
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

        {/* Security Question */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="p-5">
            <Card.Header className="p-0 pb-4">
              <Card.Title>Security Question</Card.Title>
            </Card.Header>
            <div className="space-y-4">
              {user?.security_question_id ? (
                <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Current Question</div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {getSecurityQuestionById(user.security_question_id)?.question || 'Unknown question'}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[var(--accent-warning-light)] border border-[var(--border-warning)] rounded-[var(--radius-md)]">
                  <div className="text-sm text-[var(--accent-warning)]">
                    ⚠️ No security question set. Set one to enable password recovery.
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {user?.security_question_id ? 'Update Security Question' : 'Set Security Question'}
                </label>
                <select
                  value={securityQuestionId}
                  onChange={(e) => setSecurityQuestionId(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                >
                  <option value="">Select a security question...</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.question}
                    </option>
                  ))}
                </select>
              </div>

              {securityQuestionId && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Your Answer
                  </label>
                  <Input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    className="w-full"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    This answer will be used to verify your identity when resetting your password.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveSecurityQuestion}
                loading={savingSecurityQuestion}
                disabled={!securityQuestionId || !securityAnswer.trim()}
                className="w-full md:w-auto"
              >
                {user?.security_question_id ? 'Update Security Question' : 'Set Security Question'}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* BYOK API Key - Premium Card */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card variant="glass" className="p-5 border-[var(--border-brand)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Card.Title className="mb-1">Bring Your Own Key (BYOK)</Card.Title>
                <Card.Meta>
                  Use your own Groq API key for unlimited AI tutor access
                </Card.Meta>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-[var(--accent-primary-light)] border border-[var(--border-brand)] rounded-[var(--radius-sm)]">
                <span className="text-xs text-[var(--accent-primary)] font-medium">🔒 Encrypted</span>
              </div>
            </div>
            
            {byokEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-[var(--accent-success-light)] border border-[var(--border-success)] rounded-[var(--radius-md)]">
                  <span className="text-[var(--accent-success)] text-base">✓</span>
                  <div>
                    <span className="text-[var(--accent-success)] font-medium text-sm">BYOK enabled</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Your API key is encrypted and stored securely
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">API Key</span>
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">
                      •••• •••• •••• {groqApiKey.slice(-4) || '••••'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  onClick={handleRemoveByok}
                  loading={savingByok}
                  className="w-full"
                >
                  Remove API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Usage Meter */}
                <div className="p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--text-primary)] uppercase tracking-wide">Usage</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {rateLimit.requests_remaining || 0} / {rateLimit.requests_total || 100} requests
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 mb-2">
                    <div
                      className="bg-[var(--accent-primary)] h-1.5 rounded-full transition-all duration-[var(--duration-normal)]"
                      style={{
                        width: `${((rateLimit.requests_remaining || 0) / (rateLimit.requests_total || 100)) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>{rateLimit.tokens_remaining || 0} tokens remaining</span>
                    <span>{rateLimit.requests_remaining || 0} requests remaining</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Groq API Key
                    </label>
                    <Input
                      type="password"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                      🔒 Your key is encrypted and stored securely. Never shared with third parties.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveByok}
                      loading={savingByok}
                      className="flex-1"
                    >
                      Save API Key
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        // Test key functionality (if available)
                        toast.info('Test key functionality coming soon');
                      }}
                      disabled={!groqApiKey.trim()}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* AI Tutor Session History */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <TutorSessionHistory userId={user?.id} />
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="p-5 border-[var(--border-danger)]">
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-[var(--accent-danger)]">Danger Zone</Card.Title>
            </Card.Header>
            <div className="space-y-3">
              {/* Reset Progress */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-danger)]/30">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Reset Progress</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Clear all solved questions and reset your streak
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleOpenResetModal}
                >
                  Reset
                </Button>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] border border-[var(--border-danger)]/30">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Delete Account</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
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
      {showResetModal && (
        <Modal
          isOpen={showResetModal}
          onClose={() => {
            if (!resetting) {
              setShowResetModal(false);
              setResetScope('all');
              setSelectedCompanyId('');
            }
          }}
          title="Reset Progress"
          size="md"
          closeOnOverlayClick={!resetting}
        >
          <div>
            {/* Warning Icon */}
            <div className="mb-4 flex justify-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: 'var(--accent-danger)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Reset Scope Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                What would you like to reset?
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                  <input
                    type="radio"
                    name="resetScope"
                    value="all"
                    checked={resetScope === 'all'}
                    onChange={(e) => setResetScope(e.target.value)}
                    className="mr-3"
                    disabled={resetting}
                  />
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      All Progress
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Clear all solved questions across all companies and reset your streak
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                  <input
                    type="radio"
                    name="resetScope"
                    value="company"
                    checked={resetScope === 'company'}
                    onChange={(e) => setResetScope(e.target.value)}
                    className="mr-3"
                    disabled={resetting}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Specific Company
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                      Clear solved questions for a specific company only
                    </div>
                    {resetScope === 'company' && (
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        disabled={resetting || loadingCompanies}
                      >
                        <option value="">Select a company...</option>
                        {companies.map((company) => (
                          <option key={company.id || company._id} value={company.id || company._id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Warning Message */}
            <div className="mb-6 p-3 bg-[var(--bg-surface-2)] border border-[var(--border-danger)]/30 rounded-[var(--radius-md)]">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--accent-danger)]">Warning:</strong> This action cannot be undone. 
                {resetScope === 'all' 
                  ? ' All your solved questions and streak will be permanently deleted.'
                  : selectedCompanyId 
                  ? ` All solved questions for the selected company will be permanently deleted.`
                  : ' Please select a company first.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResetModal(false);
                  setResetScope('all');
                  setSelectedCompanyId('');
                }}
                disabled={resetting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleResetProgress}
                loading={resetting}
                disabled={resetting || (resetScope === 'company' && !selectedCompanyId)}
              >
                Reset Progress
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
