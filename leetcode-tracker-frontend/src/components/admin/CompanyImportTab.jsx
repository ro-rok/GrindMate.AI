import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { previewCompanyGraphQLImport, commitCompanyGraphQLImport } from '../../api/admin';
import api from '../../api';

/**
 * CompanyImportTab Component
 * Interface for importing GraphQL dumps for specific companies
 * 
 * Works like the populate button but uses GraphQL data instead of CSV.
 * Includes ALL questions (SOLVED, TO_DO, ATTEMPTED) by default.
 */
function CompanyImportTab() {
  // State management
  const [rawInput, setRawInput] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [timeframe, setTimeframe] = useState('30_days');
  const [excludeSolved, setExcludeSolved] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      setCompanies(response.data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      toast.error('Failed to load companies');
    }
  };

  /**
   * Handle preview import
   */
  const handlePreview = async () => {
    // Validation
    if (!rawInput.trim()) {
      toast.error('Please paste GraphQL dump');
      return;
    }
    if (!companyId) {
      toast.error('Please select a company');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const result = await previewCompanyGraphQLImport(
        rawInput,
        companyId,
        timeframe,
        excludeSolved
      );

      if (result.success) {
        setPreviewData(result.data);
        toast.success('Preview generated successfully');
      } else {
        const errorMsg = result.error?.message || 'Preview failed';
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
   * Handle commit import
   */
  const handleCommit = async () => {
    if (!previewData) {
      toast.error('Please preview import first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await commitCompanyGraphQLImport(
        rawInput,
        companyId,
        timeframe,
        excludeSolved
      );

      if (result.success) {
        toast.success('Import completed successfully!');
        
        // Clear form after successful import
        setRawInput('');
        setPreviewData(null);
        setError(null);

        // Show import summary
        const { counts } = result.data;
        toast.success(
          `Created: ${counts.created}, Updated: ${counts.updated}, Skipped: ${counts.skipped}`,
          { duration: 5000 }
        );
      } else {
        const errorMsg = result.error?.message || 'Import failed';
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

  const selectedCompany = companies.find(c => c.id === companyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Company GraphQL Import 🏢
        </h2>
        <p className="text-text-secondary">
          Import LeetCode questions for a specific company and timeframe.
          Works like the populate button but uses GraphQL data instead of CSV.
        </p>
      </Card>

      {/* Input Form */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Company Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company" className="text-sm font-medium text-text-primary">
              Company
            </label>
            <select
              id="company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-base focus:border-accent-primary focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--black-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-subtle)',
              }}
              disabled={isLoading}
            >
              <option value="" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                Select a company...
              </option>
              {companies.map((company) => (
                <option 
                  key={company.id} 
                  value={company.id}
                  style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}
                >
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="timeframe" className="text-sm font-medium text-text-primary">
              Timeframe
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-base focus:border-accent-primary focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--black-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-subtle)',
              }}
              disabled={isLoading}
            >
              <option value="30_days" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                30 Days
              </option>
              <option value="60_days" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                3 Months
              </option>
              <option value="90_days" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                6 Months
              </option>
              <option value="more_than_six_months" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                More Than 6 Months
              </option>
              <option value="all_time" style={{ backgroundColor: 'var(--black-elevated)', color: 'var(--text-primary)' }}>
                All Time
              </option>
            </select>
          </div>

          {/* Exclude Solved Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="exclude-solved"
              checked={excludeSolved}
              onChange={(e) => setExcludeSolved(e.target.checked)}
              className="w-4 h-4 text-accent-primary bg-black-elevated border-border-subtle rounded focus:ring-accent-primary focus:ring-2"
              disabled={isLoading}
            />
            <label htmlFor="exclude-solved" className="text-sm text-text-primary">
              Exclude SOLVED questions (default: includes all questions)
            </label>
          </div>

          {/* Raw GraphQL Dump Textarea */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="raw-dump" className="text-sm font-medium text-text-primary">
              Raw GraphQL Dump
            </label>
            <textarea
              id="raw-dump"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste raw GraphQL response here..."
              className="w-full h-64 px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-base focus:border-accent-primary focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-sm text-text-secondary">
              Copy the raw response from Network tab → Response (not the object preview)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handlePreview}
              loading={isLoading}
              disabled={isLoading || !rawInput.trim() || !companyId}
            >
              Preview Import
            </Button>

            <Button
              variant="success"
              onClick={handleCommit}
              loading={isLoading}
              disabled={isLoading || !previewData}
            >
              Apply Import
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-accent-danger">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-accent-danger flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-accent-danger mb-1">
                Error
              </h3>
              <p className="text-text-secondary">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Preview Results */}
      {previewData && (
        <PreviewResults 
          data={previewData} 
          companyName={selectedCompany?.name}
          timeframe={timeframe}
        />
      )}
    </div>
  );
}

/**
 * PreviewResults Component
 */
function PreviewResults({ data, companyName, timeframe }) {
  const { counts, sample = [], duplicates = [], errors = [] } = data;

  const timeframeLabels = {
    '30_days': '30 Days',
    '60_days': '3 Months',
    '90_days': '6 Months',
    'more_than_six_months': 'More Than 6 Months',
    'all_time': 'All Time'
  };

  return (
    <div className="space-y-6">
      {/* Import Info */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/20">
        <h3 className="text-xl font-bold text-blue-400 mb-2">
          Import Target
        </h3>
        <div className="space-y-1 text-text-secondary">
          <p><span className="font-semibold">Company:</span> {companyName}</p>
          <p><span className="font-semibold">Timeframe:</span> {timeframeLabels[timeframe]}</p>
        </div>
      </Card>

      {/* Counts Summary */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-text-primary mb-4">
          Preview Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={counts.total} color="text-text-primary" />
          <StatCard label="Valid" value={counts.valid} color="text-accent-success" />
          <StatCard label="Invalid" value={counts.invalid} color="text-accent-danger" />
          <StatCard label="Would Create" value={counts.would_create} color="text-blue-400" />
          <StatCard label="Would Update" value={counts.would_update} color="text-yellow-400" />
          {counts.filtered_solved > 0 && (
            <StatCard label="Filtered (Solved)" value={counts.filtered_solved} color="text-gray-400" />
          )}
        </div>
      </Card>

      {/* Duplicates List */}
      {duplicates.length > 0 && (
        <Card className="p-6 border-yellow-500">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">
            ⚠️ Duplicates Found ({duplicates.length})
          </h3>
          <p className="text-text-secondary mb-3">
            The following titleSlugs appear multiple times in the input:
          </p>
          <div className="flex flex-wrap gap-2">
            {duplicates.map((slug, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-md text-sm font-mono"
              >
                {slug}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Errors List */}
      {errors.length > 0 && (
        <Card className="p-6 border-accent-danger">
          <h3 className="text-xl font-bold text-accent-danger mb-3">
            ❌ Validation Errors ({errors.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errors.map((err, idx) => (
              <div
                key={idx}
                className="p-3 bg-accent-danger/10 rounded-md border border-accent-danger/20"
              >
                <p className="font-semibold text-text-primary">{err.title || 'Unknown'}</p>
                <p className="text-sm text-text-secondary">{err.error}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sample Questions Table */}
      {sample.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-text-primary mb-4">
            Sample Questions (First {sample.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Difficulty</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">Frequency</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Topics</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((question, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border-subtle hover:bg-black-elevated-hover transition-colors"
                  >
                    <td className="py-3 px-4 text-text-primary">{question.title}</td>
                    <td className="py-3 px-4">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td className="py-3 px-4 text-center text-text-secondary">
                      {question.frequency || 0}
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-sm">
                      {question.topics || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-4 bg-black-elevated-hover rounded-lg border border-border-subtle">
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DifficultyBadge({ difficulty }) {
  const colors = {
    EASY: 'bg-green-500/10 text-green-400 border-green-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    HARD: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold border ${
        colors[difficulty] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      }`}
    >
      {difficulty}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status) {
    return <span className="text-text-secondary text-sm">—</span>;
  }

  const colors = {
    SOLVED: 'bg-accent-success/10 text-accent-success border-accent-success/20',
    TO_DO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ATTEMPTED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold border ${
        colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      }`}
    >
      {status}
    </span>
  );
}

export default CompanyImportTab;
