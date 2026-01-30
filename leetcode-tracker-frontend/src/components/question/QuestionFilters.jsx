import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

/**
 * QuestionFilters component
 * Provides comprehensive filtering for questions:
 * - Timeframe buttons (30d, 3mo, 6mo, all)
 * - Difficulty dropdown (Easy, Medium, Hard)
 * - Topics multi-select with autocomplete
 * - Search input (debounced 300ms)
 * - Sort dropdown (Priority, Recency, Difficulty, Title)
 * - Display question count for current filters
 * - Update URL query params on change
 */
const QuestionFilters = ({
  filters,
  onChange,
  questionCount = 0,
  availableTopics = [],
  className = ''
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [topicInput, setTopicInput] = useState('');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const topicInputRef = useRef(null);

  // Timeframe options
  const timeframes = [
    { value: '30_days', label: '30d' },
    { value: '90_days', label: '3mo' },
    { value: 'more_than_six_months', label: '6mo' },
    { value: 'all_time', label: 'All' }
  ];

  // Difficulty options
  const difficulties = ['EASY', 'MEDIUM', 'HARD'];

  // Sort options
  const sortOptions = [
    { value: 'priority', label: 'Priority' },
    { value: 'recency', label: 'Recency' },
    { value: 'difficulty', label: 'Difficulty' },
    { value: 'title', label: 'Title' }
  ];

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.timeframe) params.set('timeframe', filters.timeframe);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.topics.length > 0) params.set('topics', filters.topics.join(','));
    if (filters.patterns.length > 0) params.set('patterns', filters.patterns.join(','));
    if (filters.search) params.set('q', filters.search);
    if (filters.sort) params.set('sort', filters.sort);

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 300);
  }, [filters, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle timeframe change
  const handleTimeframeChange = (timeframe) => {
    onChange({ ...filters, timeframe });
  };

  // Handle difficulty change
  const handleDifficultyChange = (difficulty) => {
    const newDifficulty = filters.difficulty === difficulty ? null : difficulty;
    onChange({ ...filters, difficulty: newDifficulty });
  };

  // Handle sort change
  const handleSortChange = (e) => {
    onChange({ ...filters, sort: e.target.value });
  };

  // Handle topic selection
  const handleTopicAdd = (topic) => {
    if (!filters.topics.includes(topic)) {
      onChange({ ...filters, topics: [...filters.topics, topic] });
    }
    setTopicInput('');
    setShowTopicSuggestions(false);
  };

  // Handle topic removal
  const handleTopicRemove = (topic) => {
    onChange({ ...filters, topics: filters.topics.filter(t => t !== topic) });
  };

  // Filter topic suggestions - show more topics with better scrolling
  const topicSuggestions = availableTopics
    .filter(topic => 
      topic.toLowerCase().includes(topicInput.toLowerCase()) &&
      !filters.topics.includes(topic)
    )
    .slice(0, 50); // Show up to 50 topics instead of 10

  // Handle clear all filters
  const handleClearFilters = () => {
    onChange({
      ...filters,
      difficulty: null,
      topics: [],
      patterns: [],
      search: ''
    });
    setSearchInput('');
  };

  const hasActiveFilters = filters.difficulty || filters.topics.length > 0 || filters.search;

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Top row: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary text-sm" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* Sort dropdown */}
        <div className="w-full sm:w-40 md:w-48">
          <select
            value={filters.sort}
            onChange={handleSortChange}
            className="w-full px-3 sm:px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Second row: Timeframe buttons */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
        <span className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium">Timeframe:</span>
        {timeframes.map(({ value, label }) => (
          <Button
            key={value}
            variant={filters.timeframe === value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleTimeframeChange(value)}
            className="text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Third row: Difficulty buttons */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
        <span className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium">Difficulty:</span>
        {difficulties.map(difficulty => (
          <Button
            key={difficulty}
            variant={filters.difficulty === difficulty ? Badge.getDifficultyVariant(difficulty) : 'secondary'}
            size="sm"
            onClick={() => handleDifficultyChange(difficulty)}
            className={`text-xs ${filters.difficulty === difficulty ? 'ring-2 ring-offset-2 ring-offset-black-base' : ''}`}
          >
            {difficulty}
          </Button>
        ))}
      </div>

      {/* Fourth row: Topics multi-select */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium">Topics:</span>
          <div className="flex-1 relative">
            <Input
              ref={topicInputRef}
              type="text"
              placeholder="Add topic..."
              value={topicInput}
              onChange={(e) => {
                setTopicInput(e.target.value);
                setShowTopicSuggestions(true);
              }}
              onFocus={() => setShowTopicSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowTopicSuggestions(false), 200);
              }}
              className="text-sm"
            />
            
            {/* Topic suggestions dropdown */}
            {showTopicSuggestions && topicSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-xl max-h-48 sm:max-h-64 overflow-y-auto">
                {topicSuggestions.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleTopicAdd(topic)}
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected topics */}
        {filters.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:pl-[4.5rem]">
            {filters.topics.map(topic => (
              <div
                key={topic}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] border-0"
              >
                <span className="font-medium text-xs sm:text-sm">{topic}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTopicRemove(topic);
                  }}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${topic}`}
                  type="button"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: Question count, random question, and clear filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border-subtle">
        <div className="text-[var(--text-secondary)] text-xs sm:text-sm">
          <span className="font-semibold text-[var(--text-primary)]">{questionCount}</span> questions
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs sm:text-sm"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionFilters;
