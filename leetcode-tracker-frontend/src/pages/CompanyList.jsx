import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import { CompanyCard, CompaniesSkeletonLoader, EmptyState } from '../components/company';
import VirtualizedCompanyList from '../components/company/VirtualizedCompanyList';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import Pill from '../components/ui/Pill';
import Skeleton from '../components/ui/Skeleton';
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
      // Sort by tier
      const sorted = sortCompaniesByTier(response.data);
      setCompanies(sorted);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setError('Failed to load companies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (companyId) => {
    setFavorites(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  // Filter and categorize companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
    const hasQuestions = !showOnlyWithQuestions || (company.question_count && company.question_count > 0);
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

  const handleCompanyClick = (company) => {
    setSelectedCompanyId(company.id || company._id);
    navigate(`/companies/${getCompanyIdentifier(company)}`);
  };

  const tabs = [
    { value: 'top', label: 'Top' },
    { value: 'quant', label: 'Quant' },
    { value: 'india', label: 'India' },
    { value: 'all', label: 'All' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black-base p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton variant="title" width="200px" className="mb-4" />
          <Skeleton variant="text" width="400px" className="mb-8" />
          <CompaniesSkeletonLoader count={12} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black-base p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-accent-danger text-lg mb-4">{error}</p>
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
    <div className="min-h-screen bg-black-base p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-2 tracking-tight">
            Companies
          </h1>
          <p className="text-text-secondary text-lg">
            Practice questions from top tech companies
          </p>
          
          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-lg inline-block" role="status">
              <p className="text-accent-primary text-sm">
                💡 <span className="font-medium">Browsing as guest.</span> Sign up to track your progress!
              </p>
            </div>
          )}
        </motion.div>

        {/* Top Toolbar */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search and Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-md">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search companies... (Ctrl+K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search companies"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyWithQuestions}
                  onChange={(e) => setShowOnlyWithQuestions(e.target.checked)}
                  className="w-4 h-4 rounded border-border-soft bg-black-elevated text-accent-primary focus:ring-accent-primary"
                />
                Show only with questions
              </label>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            className="flex gap-2"
          >
            {tabs.map(tab => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs>

          {/* Results count */}
          {(search || activeTab !== 'top') && (
            <p className="text-text-secondary text-sm" role="status" aria-live="polite">
              Found {displayedCompanies.length} {displayedCompanies.length === 1 ? 'company' : 'companies'}
            </p>
          )}
        </motion.div>

        {/* Top Companies Rail (Tier S) */}
        {activeTab === 'top' && tierSCompanies.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-text-primary">Top Companies</h2>
              <Pill variant="tierS" size="sm">Tier S</Pill>
            </div>
            <div
              ref={tierSRailRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-black-elevated"
              style={{ scrollbarWidth: 'thin' }}
            >
              {tierSCompanies.map((company) => (
                <div key={company.id || company._id} className="flex-shrink-0 w-64">
                  <CompanyCard
                    company={company}
                    onClick={() => handleCompanyClick(company)}
                    isFavorite={favorites.includes(company.id || company._id)}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      toggleFavorite(company.id || company._id);
                    }}
                    isSelected={selectedCompanyId === (company.id || company._id)}
                  />
                </div>
              ))}
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
            // Regular grid for smaller lists
            <motion.div
              key="grid"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              role="list"
              aria-label="Companies list"
            >
              {displayedCompanies.map((company, index) => (
                <motion.div
                  key={company.id || company._id}
                  role="listitem"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <CompanyCard
                    company={company}
                    onClick={() => handleCompanyClick(company)}
                    isFavorite={favorites.includes(company.id || company._id)}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      toggleFavorite(company.id || company._id);
                    }}
                    isSelected={selectedCompanyId === (company.id || company._id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CompanyList;
