import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import useQuestionStore from '../store/questionStore';

/**
 * Question list page with URL state management
 * Implements filter state in query parameters
 */
function QuestionList() {
  const { companyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilters } = useQuestionStore();

  // Sync URL params with store on mount
  useEffect(() => {
    const urlFilters = {
      timeframe: searchParams.get('timeframe') || '30_days',
      difficulty: searchParams.get('difficulty') || null,
      topics: searchParams.get('topics')?.split(',').filter(Boolean) || [],
      patterns: searchParams.get('patterns')?.split(',').filter(Boolean) || [],
      search: searchParams.get('q') || '',
      sort: searchParams.get('sort') || 'priority',
    };
    setFilters(urlFilters);
  }, [searchParams, setFilters]);

  // Update URL when filters change
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

  return (
    <div className="min-h-screen bg-black-base p-8">
      <h1 className="text-2xl font-bold text-gray-50">
        Questions for Company {companyId}
      </h1>
      <p className="text-gray-400 mt-2">To be implemented</p>
      <div className="mt-4 text-gray-500 text-sm">
        <p>Current filters: {JSON.stringify(filters, null, 2)}</p>
      </div>
    </div>
  );
}

export default QuestionList;
