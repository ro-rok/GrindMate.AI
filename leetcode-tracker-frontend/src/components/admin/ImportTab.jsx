import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { previewGraphQLImport, commitGraphQLImport } from '../../api/admin';

/**
 * ImportTab Component
 * Interface for pasting and importing GraphQL dumps
 * 
 * Features:
 * - Textarea for raw GraphQL dump input
 * - Input field for list name
 * - Preview import functionality with detailed results
 * - Commit import functionality with summary
 * - Error handling and loading states
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
function ImportTab() {
  // State management (Requirement 10.1, 10.2)
  const [rawInput, setRawInput] = useState('');
  const [listName, setListName] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle preview import
   * Calls preview endpoint and displays results
   * Requirements: 10.3, 10.4
   */
  const handlePreview = async () => {
    // Validation
    if (!rawInput.trim()) {
      toast.error('Please paste GraphQL dump');
      return;
    }
    if (!listName.trim()) {
      toast.error('Please enter list name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const result = await previewGraphQLImport(rawInput, listName);

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
   * Calls commit endpoint and displays summary
   * Requirements: 10.5, 10.6, 10.7
   */
  const handleCommit = async () => {
    if (!previewData) {
      toast.error('Please preview import first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await commitGraphQLImport(rawInput, listName);

      if (result.success) {
        toast.success('Import completed successfully!');
        
        // Clear form after successful import (Requirement 10.7)
        setRawInput('');
        setListName('');
        setPreviewData(null);
        setError(null);

        // Show import summary in a separate toast
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          GraphQL Import 📥
        </h2>
        <p className="text-text-secondary">
          Paste raw GraphQL response from browser DevTools to import LeetCode questions
        </p>
      </Card>

      {/* Input Form */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* List Name Input (Requirement 10.2) */}
          <Input
            label="List Name"
            placeholder="e.g., My Favorites, Blind 75, etc."
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            helperText="A descriptive name for this import batch"
            disabled={isLoading}
          />

          {/* Raw GraphQL Dump Textarea (Requirement 10.1) */}
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
            {/* Preview Import Button (Requirement 10.3) */}
            <Button
              variant="primary"
              onClick={handlePreview}
              loading={isLoading}
              disabled={isLoading || !rawInput.trim() || !listName.trim()}
            >
              Preview Import
            </Button>

            {/* Apply Import Button (Requirement 10.5) - disabled until preview */}
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

      {/* Preview Results (Requirement 10.4) */}
      {previewData && (
        <PreviewResults data={previewData} />
      )}
    </div>
  );
}

/**
 * PreviewResults Component
 * Displays preview data including counts, sample questions, duplicates, and errors
 * 
 * Requirements: 10.3, 10.4
 */
function PreviewResults({ data }) {
  const { counts, sample = [], duplicates = [], errors = [] } = data;

  return (
    <div className="space-y-6">
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
          <StatCard label="Would Skip" value={counts.would_skip} color="text-text-secondary" />
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

      {/* Sample Questions Table (Requirement 10.4) */}
      {sample.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-text-primary mb-4">
            Sample Questions (First {sample.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                    Difficulty
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                    Frontend ID
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">
                    Paid
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">
                    Topics
                  </th>
                </tr>
              </thead>
              <tbody>
                {sample.map((question, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border-subtle hover:bg-black-elevated-hover transition-colors"
                  >
                    <td className="py-3 px-4 text-text-primary">
                      {question.title}
                    </td>
                    <td className="py-3 px-4">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td className="py-3 px-4 text-text-secondary font-mono text-sm">
                      {question.questionFrontendId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {question.paidOnly ? (
                        <span className="text-yellow-400">🔒</span>
                      ) : (
                        <span className="text-accent-success">✓</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={question.status} />
                    </td>
                    <td className="py-3 px-4 text-center text-text-secondary">
                      {question.topics?.length || 0}
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

/**
 * StatCard Component
 * Displays a single statistic with label and value
 */
function StatCard({ label, value, color }) {
  return (
    <div className="p-4 bg-black-elevated-hover rounded-lg border border-border-subtle">
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/**
 * DifficultyBadge Component
 * Displays difficulty with appropriate color
 */
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

/**
 * StatusBadge Component
 * Displays question status with appropriate styling
 */
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

export default ImportTab;
