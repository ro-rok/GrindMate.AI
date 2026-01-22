import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConfirmationModal from '../ui/ConfirmationModal';
import { getQuestions, updateQuestion, markQuestionRemoved, unmarkQuestionRemoved } from '../../api/admin';

/**
 * QuestionsTab Component
 * Search, filter, and manage questions in the admin portal
 * 
 * Features:
 * - Search by title/titleSlug/frontendId/link
 * - Filter by difficulty, paidOnly, status, source
 * - Paginated question list (50 per page)
 * - Question edit modal
 * - Raw JSON view modal
 * - Mark removed / unremove actions
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
function QuestionsTab() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    difficulty: '',
    paidOnly: '',
    status: '',
    source: '',
  });
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [questionToRemove, setQuestionToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  /**
   * Fetch questions with current search, filters, and pagination
   * Requirements: 11.1, 11.2, 11.3
   */
  const fetchQuestions = async () => {
    setIsLoading(true);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add search query if present (Requirement 11.1)
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }

      // Add filters if present (Requirement 11.2)
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.paidOnly !== '') params.paidOnly = filters.paidOnly === 'true';
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;

      const result = await getQuestions(params);

      if (result.success) {
        setQuestions(result.data.questions || []);
        setPagination(result.data.pagination || pagination);
      } else {
        toast.error(result.error?.message || 'Failed to fetch questions');
        setQuestions([]);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch questions on mount and when search/filters/pagination change
  useEffect(() => {
    fetchQuestions();
  }, [pagination.page, filters]);

  /**
   * Handle search submission
   * Requirement: 11.1
   */
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 }); // Reset to page 1
    fetchQuestions();
  };

  /**
   * Handle filter change
   * Requirement: 11.2
   */
  const handleFilterChange = (filterName, value) => {
    setFilters({ ...filters, [filterName]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to page 1
  };

  /**
   * Handle page change
   * Requirement: 11.3
   */
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  /**
   * Open edit modal for a question
   * Requirement: 11.4
   */
  const handleEditClick = (question) => {
    setSelectedQuestion(question);
    setShowEditModal(true);
  };

  /**
   * Open JSON view modal for a question
   * Requirement: 11.7
   */
  const handleViewJsonClick = (question) => {
    setSelectedQuestion(question);
    setShowJsonModal(true);
  };

  /**
   * Handle mark removed action
   * Requirement: 11.5
   */
  const handleMarkRemoved = async (question) => {
    setQuestionToRemove(question);
    setShowConfirmRemove(true);
  };

  /**
   * Confirm mark removed action
   */
  const confirmMarkRemoved = async () => {
    if (!questionToRemove) return;

    setIsRemoving(true);

    try {
      const result = await markQuestionRemoved(questionToRemove._id);

      if (result.success) {
        toast.success('Question marked as removed');
        setShowConfirmRemove(false);
        setQuestionToRemove(null);
        fetchQuestions(); // Refresh list
      } else {
        toast.error(result.error?.message || 'Failed to mark question as removed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRemoving(false);
    }
  };

  /**
   * Handle unremove action
   * Requirement: 11.6
   */
  const handleUnremove = async (questionId) => {
    try {
      const result = await unmarkQuestionRemoved(questionId);

      if (result.success) {
        toast.success('Question unmarked as removed');
        fetchQuestions(); // Refresh list
      } else {
        toast.error(result.error?.message || 'Failed to unremove question');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  /**
   * Handle edit save
   * Requirement: 11.4
   */
  const handleEditSave = async (updates) => {
    if (!selectedQuestion) return;

    try {
      const result = await updateQuestion(selectedQuestion._id, updates);

      if (result.success) {
        toast.success('Question updated successfully');
        setShowEditModal(false);
        setSelectedQuestion(null);
        fetchQuestions(); // Refresh list
      } else {
        toast.error(result.error?.message || 'Failed to update question');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Questions Management ❓
        </h2>
        <p className="text-text-secondary">
          Search, filter, and manage LeetCode questions
        </p>
      </Card>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search Bar (Requirement 11.1) */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              type="search"
              placeholder="Search by title, titleSlug, frontendId, or link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary" disabled={isLoading}>
              Search
            </Button>
          </form>

          {/* Filters (Requirement 11.2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Difficulty Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Difficulty
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Paid Only Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Paid Only
              </label>
              <select
                value={filters.paidOnly}
                onChange={(e) => handleFilterChange('paidOnly', e.target.value)}
                className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All</option>
                <option value="true">Paid Only</option>
                <option value="false">Free</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All</option>
                <option value="SOLVED">Solved</option>
                <option value="TO_DO">To Do</option>
                <option value="ATTEMPTED">Attempted</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">All</option>
                <option value="github_csv">GitHub CSV</option>
                <option value="leetcode_graphql">LeetCode GraphQL</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Questions List (Requirement 11.3) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">
            Questions ({pagination.total})
          </h3>
          {isLoading && <LoadingSpinner size="sm" label="Loading questions..." />}
        </div>

        {questions.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-text-secondary">
            No questions found. Try adjusting your search or filters.
          </div>
        ) : (
          <>
            {/* Questions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      Difficulty
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-text-primary">
                      Paid
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                      Source
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => (
                    <QuestionRow
                      key={question._id}
                      question={question}
                      onEdit={handleEditClick}
                      onViewJson={handleViewJsonClick}
                      onMarkRemoved={handleMarkRemoved}
                      onUnremove={handleUnremove}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination (Requirement 11.3) */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      {/* Edit Modal (Requirement 11.4) */}
      {showEditModal && selectedQuestion && (
        <EditQuestionModal
          question={selectedQuestion}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedQuestion(null);
          }}
          onSave={handleEditSave}
        />
      )}

      {/* JSON View Modal (Requirement 11.7) */}
      {showJsonModal && selectedQuestion && (
        <JsonViewModal
          question={selectedQuestion}
          isOpen={showJsonModal}
          onClose={() => {
            setShowJsonModal(false);
            setSelectedQuestion(null);
          }}
        />
      )}

      {/* Confirmation Modal for Mark Removed */}
      <ConfirmationModal
        isOpen={showConfirmRemove}
        onClose={() => {
          setShowConfirmRemove(false);
          setQuestionToRemove(null);
        }}
        onConfirm={confirmMarkRemoved}
        title="Mark Question as Removed"
        message={`Are you sure you want to mark "${questionToRemove?.title}" as removed? This action can be undone later.`}
        confirmLabel="Mark as Removed"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
}

/**
 * QuestionRow Component
 * Displays a single question row in the table
 */
function QuestionRow({ question, onEdit, onViewJson, onMarkRemoved, onUnremove }) {
  const isRemoved = question.metadata?.removed_on;

  return (
    <tr
      className={`border-b border-border-subtle hover:bg-black-elevated-hover transition-colors ${
        isRemoved ? 'opacity-50' : ''
      }`}
    >
      <td className="py-3 px-4 text-text-secondary font-mono text-sm">
        {question.questionFrontendId || question.frontend_id || '—'}
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="text-text-primary font-medium">
            {question.title}
          </span>
          <span className="text-text-secondary text-sm font-mono">
            {question.titleSlug || question.title_slug}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={Badge.getDifficultyVariant(question.difficulty)}>
          {question.difficulty}
        </Badge>
      </td>
      <td className="py-3 px-4 text-center">
        {question.paidOnly || question.paid_only ? (
          <span className="text-yellow-400" title="Premium">🔒</span>
        ) : (
          <span className="text-accent-success" title="Free">✓</span>
        )}
      </td>
      <td className="py-3 px-4">
        {question.status ? (
          <Badge variant="default" size="sm">
            {question.status}
          </Badge>
        ) : (
          <span className="text-text-secondary text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <Badge variant="default" size="sm">
          {question.source || 'github_csv'}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(question)}
            className="p-1.5 text-text-secondary hover:text-accent-primary transition-colors rounded hover:bg-black-elevated"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onViewJson(question)}
            className="p-1.5 text-text-secondary hover:text-blue-400 transition-colors rounded hover:bg-black-elevated"
            title="View JSON"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          {isRemoved ? (
            <button
              onClick={() => onUnremove(question._id)}
              className="p-1.5 text-text-secondary hover:text-accent-success transition-colors rounded hover:bg-black-elevated"
              title="Unremove"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => onMarkRemoved(question)}
              className="p-1.5 text-text-secondary hover:text-accent-danger transition-colors rounded hover:bg-black-elevated"
              title="Mark Removed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Pagination Component
 * Displays pagination controls
 * Requirement: 11.3
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

/**
 * EditQuestionModal Component
 * Modal for editing question fields
 * Requirement: 11.4
 */
function EditQuestionModal({ question, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    difficulty: question.difficulty || '',
    topics: question.topics || [],
    frequency: question.frequency || 0,
    acceptance_rate: question.acceptance_rate || question.acRate || 0,
  });
  const [topicInput, setTopicInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTopic = () => {
    if (!topicInput.trim()) return;

    const slug = topicInput.toLowerCase().replace(/\s+/g, '-');
    const newTopic = { name: topicInput.trim(), slug };

    setFormData({
      ...formData,
      topics: [...formData.topics, newTopic],
    });
    setTopicInput('');
  };

  const handleRemoveTopic = (index) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((_, i) => i !== index),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Question"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Info */}
        <div className="p-4 bg-black-elevated-hover rounded-lg border border-border-subtle">
          <h4 className="font-semibold text-text-primary mb-1">
            {question.title}
          </h4>
          <p className="text-sm text-text-secondary font-mono">
            {question.titleSlug || question.title_slug}
          </p>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Difficulty
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            className="px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
            required
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Frequency */}
        <Input
          type="number"
          label="Frequency"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: parseFloat(e.target.value) || 0 })}
          min="0"
          step="1"
        />

        {/* Acceptance Rate */}
        <Input
          type="number"
          label="Acceptance Rate (0-1)"
          value={formData.acceptance_rate}
          onChange={(e) => setFormData({ ...formData, acceptance_rate: parseFloat(e.target.value) || 0 })}
          min="0"
          max="1"
          step="0.01"
          helperText="Enter as decimal (e.g., 0.56 for 56%)"
        />

        {/* Topics */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Topics
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Add topic..."
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTopic();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddTopic}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.topics.map((topic, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 bg-black-elevated-hover rounded-full border border-border-subtle"
              >
                <span className="text-sm text-text-primary">{topic.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(idx)}
                  className="text-text-secondary hover:text-accent-danger transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * JsonViewModal Component
 * Modal for viewing raw question JSON
 * Requirement: 11.7
 */
function JsonViewModal({ question, isOpen, onClose }) {
  const jsonString = JSON.stringify(question, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success('JSON copied to clipboard');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raw JSON View"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-text-secondary">
            Read-only view of the question document
          </p>
          <Button
            variant="secondary"
            onClick={handleCopy}
            size="sm"
          >
            Copy JSON
          </Button>
        </div>

        <div className="relative">
          <pre className="p-4 bg-black-base text-text-primary rounded-lg border border-border-subtle overflow-x-auto max-h-[60vh] text-sm font-mono">
            {jsonString}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

export default QuestionsTab;
