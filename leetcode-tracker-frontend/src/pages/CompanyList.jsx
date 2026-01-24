import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import { CompanyCard, CompaniesSkeletonLoader, EmptyState } from '../components/company';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { motionVariants, motionTransitions, staggerChildren } from '../utils/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getCompanyIdentifier } from '../utils/slugify';

/**
 * CompanyList page
 * Displays all companies with search and favorite functionality
 * Accessible to both authenticated and anonymous users
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1
 */
function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => {
    // Load favorites from localStorage
    const saved = localStorage.getItem('favoriteCompanies');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favoriteCompanies', JSON.stringify(favorites));
  }, [favorites]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Public endpoint - no auth required (Requirement 8.1)
      const response = await api.get('/companies');
      setCompanies(response.data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setError('Failed to load companies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = (companyId) => {
    setFavorites(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  // Filter companies based on search and favorites
  const filteredCompanies = companies
    .filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
      const matchesFavorites = !showFavoritesOnly || favorites.includes(company.id || company._id);
      return matchesSearch && matchesFavorites;
    })
    .sort((a, b) => {
      // Sort favorites first
      const aId = a.id || a._id;
      const bId = b.id || b._id;
      const aIsFav = favorites.includes(aId);
      const bIsFav = favorites.includes(bId);
      
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return a.name.localeCompare(b.name);
    });

  // Handle company card click (Requirement 3.5)
  const handleCompanyClick = (company) => {
    navigate(`/companies/${getCompanyIdentifier(company)}`);
  };

  // Motion variants
  const MotionDiv = prefersReducedMotion ? 'div' : motion.div;
  
  const containerVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: staggerChildren(0.05)
    }
  };

  // Loading state (Requirement 3.2)
  if (loading) {
    return (
      <div className="min-h-screen bg-black-base p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-10 w-48 bg-gray-800 rounded animate-pulse mb-2" />
            <div className="h-6 w-96 bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Search skeleton */}
          <div className="mb-8">
            <div className="h-12 w-full max-w-md bg-gray-800 rounded-lg animate-pulse" />
          </div>

          {/* Companies grid skeleton */}
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
              <button
                onClick={fetchCompanies}
                className="px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/80 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-base p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header (Requirement 3.3) */}
        <MotionDiv
          initial={prefersReducedMotion ? {} : motionVariants.fadeInUp.initial}
          animate={prefersReducedMotion ? {} : motionVariants.fadeInUp.animate}
          transition={prefersReducedMotion ? {} : motionTransitions.normal}
          className="mb-8"
        >
          <header>
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Companies
            </h1>
            <p className="text-text-secondary text-lg">
              Practice questions from top tech companies
            </p>
            
            {/* Anonymous user notice */}
            {!isAuthenticated && (
              <div className="mt-4 p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-lg inline-block" role="status" aria-live="polite">
                <p className="text-accent-primary text-sm">
                  💡 <span className="font-medium">Browsing as guest.</span> Sign up to track your progress!
                </p>
              </div>
            )}
          </header>
        </MotionDiv>

        {/* Search bar and filters */}
        <MotionDiv
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { ...motionTransitions.normal, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div role="search" className="flex-1 max-w-md">
              <Input
                type="search"
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search companies"
              />
            </div>
            
            {/* Favorites filter */}
            {favorites.length > 0 && (
              <Button
                variant={showFavoritesOnly ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="whitespace-nowrap"
              >
                ⭐ {showFavoritesOnly ? 'Show All' : `Favorites (${favorites.length})`}
              </Button>
            )}
          </div>
          
          {/* Results count */}
          {(search || showFavoritesOnly) && (
            <p className="text-text-secondary text-sm mt-2" role="status" aria-live="polite">
              Found {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
            </p>
          )}
        </MotionDiv>

        {/* Companies grid or empty state */}
        <AnimatePresence mode="wait">
          {filteredCompanies.length === 0 ? (
            // Empty state (Requirement 3.6)
            <EmptyState key="empty" search={search} />
          ) : (
            // Companies grid with staggered animations (Requirement 3.7)
            <MotionDiv
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              role="list"
              aria-label="Companies list"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredCompanies.map((company, index) => (
                <div key={company.id || company._id} role="listitem">
                  <CompanyCard
                    company={company}
                    index={index}
                    onClick={() => handleCompanyClick(company)}
                    isFavorite={favorites.includes(company.id || company._id)}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      toggleFavorite(company.id || company._id);
                    }}
                  />
                </div>
              ))}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CompanyList;
