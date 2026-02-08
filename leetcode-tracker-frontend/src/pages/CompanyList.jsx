import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import { usePageTitle } from '../hooks/usePageTitle';
import { CompanyCard, CompanyRow, CompaniesSkeletonLoader, EmptyState } from '../components/company';
import VirtualizedCompanyList from '../components/company/VirtualizedCompanyList';
import Input from '../components/ui/Input';
import SearchInput from '../components/ui/SearchInput';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import Pill from '../components/ui/Pill';
import Skeleton from '../components/ui/Skeleton';
import Tooltip from '../components/ui/Tooltip';
import { 
  getCompanyTier, 
  getTierSCompanies, 
  getTierACompanies, 
  getQuantCompanies, 
  getIndiaProductCompanies,
  sortCompaniesByTier,
} from '../data/companyPriority';
import { getCompanyIdentifier } from '../utils/slugify';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * CompanyList page - Premium redesign
 * Features:
 * - Top toolbar with search, tabs, toggle
 * - Top companies rail (Tier S)
 * - Virtualized list for large datasets
 * - Keyboard navigation
 * - Company prioritization
 */
function CompanyList() {
  // Set page title
  usePageTitle('Companies');
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('top');
  const [showOnlyWithQuestions, setShowOnlyWithQuestions] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favoriteCompanies');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [isFetchingCounts, setIsFetchingCounts] = useState(false);
  const companyRowRefs = useRef([]);
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();
  const searchInputRef = useRef(null);
  const tierSRailRef = useRef(null);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteCompanies', JSON.stringify(favorites));
  }, [favorites]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus search on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/companies');
      const companiesList = response.data;
      
      // Sort by tier first (without question counts)
      const sorted = sortCompaniesByTier(companiesList.map(c => ({
        ...c,
        question_count: undefined, // Will be fetched lazily if needed
        updated_at: undefined
      })));
      setCompanies(sorted);
      
      // Don't fetch question counts on initial load - only when filter is enabled
      // This prevents overwhelming the API
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setError('Failed to load companies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Lazy fetch question counts - only when needed
  const isFetchingRef = useRef(false);
  const fetchQuestionCountsLazily = useCallback(async (companiesList) => {
    if (isFetchingRef.current) return; // Prevent multiple simultaneous fetches
    isFetchingRef.current = true;
    
    setIsFetchingCounts(true);
    try {
      // Only fetch for first 20 companies to avoid rate limiting
      // Use limit=1 to just check if questions exist (much faster)
      const companiesToCheck = companiesList.slice(0, 20);
      const chunkSize = 2;
      const companiesWithCounts = [...companiesList];
      
      for (let i = 0; i < companiesToCheck.length; i += chunkSize) {
        const chunk = companiesToCheck.slice(i, i + chunkSize);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (company) => {
            try {
              // Just check if questions exist with limit=1 (much faster)
              const questionsResponse = await api.get(`/companies/${company.id || company._id}/questions.json`, {
                params: { limit: 1, sort: 'recency' }
              });
              const questions = Array.isArray(questionsResponse.data) ? questionsResponse.data : [];
              
              return {
                companyId: company.id || company._id,
                question_count: questions.length > 0 ? 1 : 0, // Just indicate if questions exist
                updated_at: questions.length > 0 && questions[0].updated_at ? questions[0].updated_at : null
              };
            } catch (err) {
              // If rate limited or error, skip this company
              if (err.response?.status === 429) {
                console.warn('Rate limited, stopping question count fetch');
                throw err; // Stop fetching on rate limit
              }
              return {
                companyId: company.id || company._id,
                question_count: 0,
                updated_at: null
              };
            }
          })
        );
        
        // Update companies with counts
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const idx = companiesWithCounts.findIndex(c => (c.id || c._id) === result.value.companyId);
            if (idx >= 0) {
              companiesWithCounts[idx] = {
                ...companiesWithCounts[idx],
                question_count: result.value.question_count,
                updated_at: result.value.updated_at
              };
            }
          }
        });
        
        // Update state incrementally
        setCompanies([...companiesWithCounts]);
        
        // Delay between chunks to avoid rate limiting
        if (i + chunkSize < companiesToCheck.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn('Rate limited while fetching question counts');
      } else {
        console.error('Error fetching question counts:', err);
      }
    } finally {
      setIsFetchingCounts(false);
      isFetchingRef.current = false;
    }
  }, []);

  const toggleFavorite = (companyId) => {
    setFavorites(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  // Fetch question counts when filter is enabled (only once when filter is toggled)
  const hasFetchedCountsRef = useRef(false);
  useEffect(() => {
    if (showOnlyWithQuestions && companies.length > 0 && !isFetchingCounts && !hasFetchedCountsRef.current) {
      hasFetchedCountsRef.current = true;
      fetchQuestionCountsLazily(companies);
    } else if (!showOnlyWithQuestions) {
      // Reset flag when filter is disabled
      hasFetchedCountsRef.current = false;
    }
  }, [showOnlyWithQuestions, fetchQuestionCountsLazily]);

  // Filter and categorize companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
    // Check if company has questions - question_count should be > 0
    // If question_count is undefined and filter is active, include it (will be filtered once count is fetched)
    const hasQuestions = !showOnlyWithQuestions || 
      (company.question_count !== undefined && company.question_count > 0) ||
      (company.question_count === undefined && !isFetchingCounts); // Include while fetching
    return matchesSearch && hasQuestions;
  });

  // Get companies by tab
  const getCompaniesByTab = () => {
    switch (activeTab) {
      case 'top':
        // Tier S + Tier A + Favorites
        return filteredCompanies.filter(company => {
          const tier = getCompanyTier(company.name);
          const isFav = favorites.includes(company.id || company._id);
          return (tier === 'S' || tier === 'A' || isFav);
        });
      case 'quant':
        return getQuantCompanies(filteredCompanies);
      case 'india':
        return getIndiaProductCompanies(filteredCompanies);
      case 'all':
      default:
        return filteredCompanies;
    }
  };

  const displayedCompanies = getCompaniesByTab();
  const tierSCompanies = displayedCompanies.filter(c => getCompanyTier(c.name) === 'S');
  const tierACompanies = displayedCompanies.filter(c => getCompanyTier(c.name) === 'A');
  const tierQCompanies = displayedCompanies.filter(c => getCompanyTier(c.name) === 'Quant');
  const tierINCompanies = displayedCompanies.filter(c => getCompanyTier(c.name) === 'India');

  const handleCompanyClick = (company) => {
    setSelectedCompanyId(company.id || company._id);
    navigate(`/companies/${getCompanyIdentifier(company)}`);
  };

  const tabOptions = [
    { value: 'top', label: 'Top' },
    { value: 'quant', label: 'Quant' },
    { value: 'india', label: 'India' },
    { value: 'all', label: 'All' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton variant="text" width="200px" height="32px" className="mb-4" />
          <Skeleton variant="text" width="400px" height="20px" className="mb-8" />
            <div className="space-y-[var(--space-2)]">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} variant="row" height={72} className="rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-[var(--accent-danger)] text-lg mb-4">{error}</p>
              <Button onClick={fetchCompanies} variant="primary">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
            Companies
          </h1>
          <p className="text-[var(--text-secondary)] text-base">
            Practice questions from top tech companies
          </p>
          
          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-[var(--accent-primary-light)] border border-[var(--border-brand)] rounded-[var(--radius-md)] inline-block" role="status">
              <p className="text-[var(--accent-primary)] text-sm">
                💡 <span className="font-medium">Browsing as guest.</span> Sign up to track your progress!
              </p>
            </div>
          )}
        </motion.div>

        {/* Top Toolbar - Sticky */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="sticky top-0 z-10 bg-[var(--bg-base)] pb-[var(--space-4)] mb-[var(--space-4)] space-y-4"
        >
          {/* Search and Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-md">
              <SearchInput
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                keyboardHint="Ctrl+K"
                onClear={() => setSearch('')}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyWithQuestions}
                  onChange={(e) => setShowOnlyWithQuestions(e.target.checked)}
                  className="w-4 h-4 rounded-[var(--radius-sm)] border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                Show only with questions
              </label>
            </div>
          </div>

          {/* Segmented Control */}
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={tabOptions}
            size="md"
          />

          {/* Results count */}
          {(search || activeTab !== 'top') && (
            <p className="text-[var(--text-secondary)] text-sm" role="status" aria-live="polite">
              Found {displayedCompanies.length} {displayedCompanies.length === 1 ? 'company' : 'companies'}
            </p>
          )}
        </motion.div>

        {/* Recommended - Company Cards */}
        {activeTab === 'top' && (tierSCompanies.length > 0 || tierACompanies.length > 0 || tierQCompanies.length > 0 || tierINCompanies.length > 0) && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-[var(--space-12)]"
          >
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-[var(--space-1)]">Recommended</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Top companies to practice from
                </p>
              </div>
            </div>
            
            {/* Company cards grid - Premium layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[var(--space-4)]">
              {[...tierSCompanies, ...tierACompanies, ...tierQCompanies, ...tierINCompanies].map((company, index) => {
                const companyId = company.id || company._id;
                return (
                  <motion.div
                    key={companyId}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <CompanyCard
                      company={company}
                      onClick={() => handleCompanyClick(company)}
                      index={index}
                      isFavorite={favorites.includes(companyId)}
                      onToggleFavorite={() => toggleFavorite(companyId)}
                      isSelected={selectedCompanyId === companyId}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Companies List */}
        <AnimatePresence mode="wait">
          {displayedCompanies.length === 0 ? (
            <div key="empty" className="py-12">
              <EmptyState
                icon="🔍"
                title="No companies found"
                description={search ? `No companies match "${search}"` : 'Try adjusting your filters'}
              />
            </div>
          ) : displayedCompanies.length > 50 ? (
            // Virtualized list for large datasets
            <VirtualizedCompanyList
              key="virtualized"
              companies={displayedCompanies}
              onCompanyClick={handleCompanyClick}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              selectedCompanyId={selectedCompanyId}
              itemHeight={200}
            />
          ) : (
            // Dense row list for smaller lists
            <motion.div
              key="list"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-[var(--space-1_5)]"
              role="list"
              aria-label="Companies list"
            >
              {displayedCompanies.map((company, index) => {
                const companyId = company.id || company._id;
                return (
                  <motion.div
                    key={companyId}
                    role="listitem"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                  >
                    <div
                      ref={(el) => (companyRowRefs.current[index] = el)}
                      tabIndex={0}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => {
                        // Only clear if focus moved outside the list
                        setTimeout(() => {
                          if (!companyRowRefs.current.some(ref => ref === document.activeElement)) {
                            setFocusedIndex(-1);
                          }
                        }, 0);
                      }}
                    >
                      <CompanyRow
                        company={company}
                        onClick={() => handleCompanyClick(company)}
                        isFavorite={favorites.includes(companyId)}
                        onToggleFavorite={() => toggleFavorite(companyId)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CompanyList;
