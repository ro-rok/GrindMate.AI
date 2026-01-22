import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import { getDashboardStats } from '../../api/admin';

/**
 * DashboardTab Component
 * Admin dashboard with quick stats, action buttons, and recent activity
 * 
 * Features:
 * - Display quick stats: total questions, total imports, recent activity
 * - Quick action buttons: Go to Import, Go to Questions, Go to Companies
 * - Display recent audit logs (last 10)
 * 
 * Requirements: 18.2
 */
function DashboardTab() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalImports: 0,
    recentLogs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  /**
   * Fetch dashboard statistics
   */
  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDashboardStats();

      if (result.success) {
        setStats(result.data);
      } else {
        const errorMsg = result.error?.message || 'Failed to load dashboard stats';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get action display name
   */
  const getActionDisplay = (action) => {
    const actionMap = {
      admin_access: 'Portal Access',
      import_preview: 'Import Preview',
      import_commit: 'Import Commit',
      question_edit: 'Question Edit',
      company_refresh: 'Company Refresh',
    };
    return actionMap[action] || action;
  };

  /**
   * Get action icon
   */
  const getActionIcon = (action) => {
    const iconMap = {
      admin_access: '🔐',
      import_preview: '👁️',
      import_commit: '📥',
      question_edit: '✏️',
      company_refresh: '🔄',
    };
    return iconMap[action] || '📋';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <LoadingSpinner size="lg" label="Loading dashboard..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={error}
        onRetry={fetchStats}
        retryLabel="Retry"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Dashboard 📊
        </h2>
        <p className="text-text-secondary">
          Overview of admin portal activity and quick actions
        </p>
      </Card>

      {/* Quick Stats (Requirement 18.2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon="❓"
          label="Total Questions"
          value={stats.totalQuestions}
          color="text-accent-primary"
        />
        <StatCard
          icon="📥"
          label="Total Imports"
          value={stats.totalImports}
          color="text-accent-success"
        />
        <StatCard
          icon="📋"
          label="Recent Activity"
          value={stats.recentLogs.length}
          color="text-blue-400"
        />
      </div>

      {/* Quick Actions (Requirement 18.2) */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-text-primary mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionButton
            icon="📥"
            label="Go to Import"
            description="Import GraphQL dumps"
            onClick={() => navigate('/admin?tab=import')}
          />
          <ActionButton
            icon="❓"
            label="Go to Questions"
            description="Manage questions"
            onClick={() => navigate('/admin?tab=questions')}
          />
          <ActionButton
            icon="🏢"
            label="Go to Companies"
            description="Manage companies"
            onClick={() => navigate('/admin?tab=companies')}
          />
        </div>
      </Card>

      {/* Recent Audit Logs (Requirement 18.2) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">
            Recent Activity
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin?tab=logs')}
          >
            View All Logs
          </Button>
        </div>

        {stats.recentLogs.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentLogs.map((log, idx) => (
              <div
                key={log._id || idx}
                className="p-4 bg-black-elevated-hover rounded-lg border border-border-subtle hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getActionIcon(log.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-text-primary">
                        {getActionDisplay(log.action)}
                      </h4>
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate">
                      {log.actor_email || 'Unknown user'}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-text-secondary">
                        {log.metadata.counts && (
                          <span>
                            Created: {log.metadata.counts.created || 0}, 
                            Updated: {log.metadata.counts.updated || 0}
                          </span>
                        )}
                        {log.metadata.company_name && (
                          <span>Company: {log.metadata.company_name}</span>
                        )}
                        {log.metadata.question_id && (
                          <span>Question ID: {log.metadata.question_id}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * StatCard Component
 * Displays a single statistic with icon, label, and value
 */
function StatCard({ icon, label, value, color }) {
  return (
    <Card className="p-6 hover:border-accent-primary/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-4xl" aria-hidden="true">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * ActionButton Component
 * Quick action button with icon, label, and description
 */
function ActionButton({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-black-elevated hover:bg-black-elevated-hover border border-border-subtle hover:border-accent-primary/50 rounded-lg transition-all duration-200 text-left group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-text-primary mb-1 group-hover:text-accent-primary transition-colors">
            {label}
          </h4>
          <p className="text-sm text-text-secondary">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default DashboardTab;
