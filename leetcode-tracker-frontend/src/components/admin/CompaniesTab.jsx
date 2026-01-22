import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConfirmationModal from '../ui/ConfirmationModal';
import api from '../../api';
import { refreshCompany } from '../../api/admin';

/**
 * CompaniesTab Component
 * Manage companies and trigger CSV refresh in the admin portal
 * 
 * Features:
 * - Company list with search capability
 * - "Refresh from GitHub CSV" button for each company
 * - Progress indicator during refresh
 * - Display refresh results (counts)
 * 
 * Requirements: 12.1, 12.2, 12.3
 */
function CompaniesTab() {
  // State management
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingCompanyId, setRefreshingCompanyId] = useState(null);
  const [refreshResults, setRefreshResults] = useState(null);
  const [showConfirmRefresh, setShowConfirmRefresh] = useState(false);
  const [companyToRefresh, setCompanyToRefresh] = useState(null);

  /**
   * Fetch companies on mount
   * Requirement: 12.1
   */
  useEffect(() => {
    fetchCompanies();
  }, []);

  /**
   * Fetch all companies from the API
   * Requirement: 12.1
   */
  const fetchCompanies = async () => {
    setIsLoading(true);

    try {
      const response = await api.get('/companies');
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle company refresh
   * Triggers CSV refresh for a specific company
   * Requirements: 12.2, 12.3
   */
  const handleRefresh = (company) => {
    setCompanyToRefresh(company);
    setShowConfirmRefresh(true);
  };

  /**
   * Confirm company refresh
   */
  const confirmRefresh = async () => {
    if (!companyToRefresh) return;

    const companyId = companyToRefresh.id || companyToRefresh._id;

    setRefreshingCompanyId(companyId);
    setRefreshResults(null);

    try {
      const result = await refreshCompany(companyId);

      if (result.success) {
        // Display refresh results (Requirement 12.3)
        const { counts, company_name } = result.data;
        setRefreshResults({
          companyId,
          companyName: company_name || companyToRefresh.name,
          counts,
        });

        toast.success(
          `${company_name || companyToRefresh.name} refreshed: ${counts.updated} updated, ${counts.inserted} inserted, ${counts.removed_marked} removed`,
          { duration: 5000 }
        );

        setShowConfirmRefresh(false);
        setCompanyToRefresh(null);
      } else {
        toast.error(result.error?.message || 'Refresh failed');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setRefreshingCompanyId(null);
    }
  };

  /**
   * Filter companies based on search query
   * Requirement: 12.1
   */
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Companies Management 🏢
        </h2>
        <p className="text-text-secondary">
          Manage companies and refresh question data from GitHub CSV
        </p>
      </Card>

      {/* Search Bar (Requirement 12.1) */}
      <Card className="p-6">
        <Input
          type="search"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search companies"
        />
        {searchQuery && (
          <p className="text-sm text-text-secondary mt-2">
            Found {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          </p>
        )}
      </Card>

      {/* Refresh Results Display (Requirement 12.3) */}
      {refreshResults && (
        <Card className="p-6 border-accent-success">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-accent-success flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-accent-success mb-2">
                Refresh Complete: {refreshResults.companyName}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-black-elevated-hover rounded-lg border border-border-subtle">
                  <p className="text-sm text-text-secondary mb-1">Updated</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {refreshResults.counts.updated}
                  </p>
                </div>
                <div className="p-3 bg-black-elevated-hover rounded-lg border border-border-subtle">
                  <p className="text-sm text-text-secondary mb-1">Inserted</p>
                  <p className="text-2xl font-bold text-accent-success">
                    {refreshResults.counts.inserted}
                  </p>
                </div>
                <div className="p-3 bg-black-elevated-hover rounded-lg border border-border-subtle">
                  <p className="text-sm text-text-secondary mb-1">Removed</p>
                  <p className="text-2xl font-bold text-accent-danger">
                    {refreshResults.counts.removed_marked}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Companies List (Requirement 12.1) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">
            Companies ({filteredCompanies.length})
          </h3>
          {isLoading && <LoadingSpinner size="sm" label="Loading companies..." />}
        </div>

        {filteredCompanies.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-text-secondary">
            {searchQuery
              ? 'No companies found matching your search.'
              : 'No companies available.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCompanies.map((company) => (
              <CompanyRow
                key={company.id || company._id}
                company={company}
                isRefreshing={refreshingCompanyId === (company.id || company._id)}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Confirmation Modal for Company Refresh */}
      <ConfirmationModal
        isOpen={showConfirmRefresh}
        onClose={() => {
          setShowConfirmRefresh(false);
          setCompanyToRefresh(null);
        }}
        onConfirm={confirmRefresh}
        title="Refresh Company Questions"
        message={`Are you sure you want to refresh questions for "${companyToRefresh?.name}" from GitHub CSV? This will update existing questions and may mark some as removed.`}
        confirmLabel="Refresh from GitHub CSV"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={!!refreshingCompanyId}
      />
    </div>
  );
}

/**
 * CompanyRow Component
 * Displays a single company with refresh button
 * Requirements: 12.1, 12.2, 12.3
 */
function CompanyRow({ company, isRefreshing, onRefresh }) {
  return (
    <div className="flex items-center justify-between p-4 bg-black-elevated-hover rounded-lg border border-border-subtle hover:border-accent-primary/30 transition-colors">
      <div className="flex-1">
        <h4 className="text-lg font-semibold text-text-primary mb-1">
          {company.name}
        </h4>
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span>
            ID: <span className="font-mono">{company.id || company._id}</span>
          </span>
          {company.slug && (
            <span>
              Slug: <span className="font-mono">{company.slug}</span>
            </span>
          )}
          {company.question_count !== undefined && (
            <span>
              Questions: <span className="font-semibold">{company.question_count}</span>
            </span>
          )}
        </div>
      </div>

      {/* Refresh Button (Requirement 12.2) */}
      <div className="flex items-center gap-3">
        {/* Progress Indicator (Requirement 12.3) */}
        {isRefreshing && (
          <div className="flex items-center gap-2 text-accent-primary">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Refreshing...</span>
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={() => onRefresh(company)}
          disabled={isRefreshing}
          loading={isRefreshing}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh from GitHub CSV
        </Button>
      </div>
    </div>
  );
}

export default CompaniesTab;
