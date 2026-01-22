import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getAuditLogs } from '../../api/admin';

/**
 * AuditLogsTab Component
 * Display and filter audit logs for administrative actions
 * 
 * Features:
 * - Paginated audit log list (50 per page)
 * - Filters: action, actor, date range
 * - Expandable log details
 * - Display: actor_email, action, timestamp, metadata
 * 
 * Requirements: 13.1-13.7
 */
function AuditLogsTab() {
  // State management
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    action: '',
    actor: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  /**
   * Fetch audit logs with current filters and pagination
   * Requirements: 13.1-13.7
   */
  const fetchLogs = async () => {
    setIsLoading(true);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add filters if present
      if (filters.action) params.action = filters.action;
      if (filters.actor) params.actor = filters.actor;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const result = await getAuditLogs(params);

      if (result.success) {
        setLogs(result.data.logs || []);
        setPagination(result.data.pagination || pagination);
      } else {
        toast.error(result.error?.message || 'Failed to fetch audit logs');
        setLogs([]);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch logs on mount and when filters/pagination change
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  /**
   * Handle filter change
   */
  const handleFilterChange = (filterName, value) => {
    setFilters({ ...filters, [filterName]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to page 1
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  /**
   * Toggle expanded log details
   */
  const toggleExpanded = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({
      action: '',
      actor: '',
      start_date: '',
      end_date: '',
    });
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Audit Logs 📋
        </h2>
        <p className="text-text-secondary">
          View and filter administrative actions for security and compliance tracking
        </p>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-text-primary">
              Filters
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All Actions</option>
                <option value="admin_access">Admin Access</option>
                <option value="import_preview">Import Preview</option>
                <option value="import_commit">Import Commit</option>
                <option value="question_edit">Question Edit</option>
                <option value="question_mark_removed">Question Mark Removed</option>
                <option value="question_unremove">Question Unremove</option>
                <option value="company_refresh">Company Refresh</option>
              </select>
            </div>

            {/* Actor Filter */}
            <Input
              label="Actor"
              placeholder="Email or User ID"
              value={filters.actor}
              onChange={(e) => handleFilterChange('actor', e.target.value)}
            />

            {/* Start Date Filter */}
            <Input
              type="date"
              label="Start Date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />

            {/* End Date Filter */}
            <Input
              type="date"
              label="End Date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Audit Logs List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">
            Logs ({pagination.total})
          </h3>
          {isLoading && <LoadingSpinner size="sm" label="Loading audit logs..." />}
        </div>

        {logs.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-text-secondary">
            No audit logs found. Try adjusting your filters.
          </div>
        ) : (
          <>
            {/* Logs List */}
            <div className="space-y-3">
              {logs.map((log) => (
                <AuditLogItem
                  key={log._id}
                  log={log}
                  isExpanded={expandedLogId === log._id}
                  onToggleExpanded={() => toggleExpanded(log._id)}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * AuditLogItem Component
 * Displays a single audit log entry with expandable details
 * Requirements: 13.1-13.7
 */
function AuditLogItem({ log, isExpanded, onToggleExpanded }) {
  // Format timestamp
  const timestamp = new Date(log.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Get action badge variant
  const getActionVariant = (action) => {
    if (action.includes('import')) return 'primary';
    if (action.includes('edit') || action.includes('update')) return 'warning';
    if (action.includes('removed') || action.includes('delete')) return 'danger';
    if (action.includes('refresh')) return 'success';
    return 'default';
  };

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden hover:border-accent-primary/30 transition-colors">
      {/* Log Header - Always Visible */}
      <button
        onClick={onToggleExpanded}
        className="w-full p-4 bg-black-elevated hover:bg-black-elevated-hover transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Action Badge */}
              <Badge variant={getActionVariant(log.action)}>
                {log.action}
              </Badge>

              {/* Timestamp */}
              <span className="text-sm text-text-secondary">
                {timestamp}
              </span>
            </div>

            {/* Actor Email */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-text-primary font-medium truncate">
                {log.actor_email}
              </span>
            </div>

            {/* Quick Metadata Preview */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mt-2 text-sm text-text-secondary">
                {getMetadataPreview(log.action, log.metadata)}
              </div>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 text-text-secondary transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 bg-black-base border-t border-border-subtle">
          <div className="space-y-3">
            {/* Actor User ID */}
            {log.actor_user_id && (
              <DetailRow
                label="Actor User ID"
                value={log.actor_user_id}
                mono
              />
            )}

            {/* IP Address (Requirement 13.7) */}
            {log.ip_address && (
              <DetailRow
                label="IP Address"
                value={log.ip_address}
                mono
              />
            )}

            {/* User Agent (Requirement 13.7) */}
            {log.user_agent && (
              <DetailRow
                label="User Agent"
                value={log.user_agent}
                mono
                truncate
              />
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-2">
                  Metadata
                </h4>
                <div className="p-3 bg-black-elevated rounded-lg border border-border-subtle">
                  <pre className="text-sm text-text-secondary overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Log ID */}
            <DetailRow
              label="Log ID"
              value={log._id}
              mono
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * DetailRow Component
 * Displays a label-value pair in the expanded log details
 */
function DetailRow({ label, value, mono = false, truncate = false }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm text-text-primary ${mono ? 'font-mono' : ''} ${
          truncate ? 'truncate' : ''
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Get a quick preview of metadata for display in collapsed state
 */
function getMetadataPreview(action, metadata) {
  if (action.includes('import')) {
    const counts = metadata.counts || {};
    return `Created: ${counts.created || 0}, Updated: ${counts.updated || 0}, Skipped: ${counts.skipped || 0}`;
  }

  if (action.includes('refresh')) {
    const counts = metadata.counts || {};
    return `Updated: ${counts.updated || 0}, Inserted: ${counts.inserted || 0}`;
  }

  if (action.includes('edit')) {
    const changes = metadata.changes || {};
    const changedFields = Object.keys(changes);
    return changedFields.length > 0
      ? `Changed: ${changedFields.join(', ')}`
      : 'No changes';
  }

  if (action.includes('mark_removed')) {
    return `Question ID: ${metadata.question_id || 'Unknown'}`;
  }

  // Default: show number of metadata keys
  const keyCount = Object.keys(metadata).length;
  return `${keyCount} metadata ${keyCount === 1 ? 'field' : 'fields'}`;
}

/**
 * Pagination Component
 * Displays pagination controls
 */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show first, last, current, and nearby pages
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {pages.map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-3 py-2 text-text-secondary">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded transition-colors ${
              currentPage === page
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-black-elevated'
            }`}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}

export default AuditLogsTab;
