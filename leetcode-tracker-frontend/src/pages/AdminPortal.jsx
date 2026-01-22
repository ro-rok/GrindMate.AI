import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAdminCheck from '../hooks/useAdminCheck';
import DashboardTab from '../components/admin/DashboardTab';
import ImportTab from '../components/admin/ImportTab';
import QuestionsTab from '../components/admin/QuestionsTab';
import CompaniesTab from '../components/admin/CompaniesTab';
import AuditLogsTab from '../components/admin/AuditLogsTab';

/**
 * AdminPortal Component
 * Main container for admin interface with tab navigation
 * 
 * Features:
 * - Tab navigation (Dashboard, Import, Companies, Questions, Logs)
 * - Admin access control with redirect
 * - Consistent dark theme
 * - URL query parameter support for tab navigation
 * 
 * Requirements: 18.1, 18.2, 18.4
 */
function AdminPortal() {
  const isAdmin = useAdminCheck();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    setActiveTab(tab);
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Redirect non-admin users to home with error toast (Requirement 18.3)
  if (!isAdmin) {
    toast.error('Unauthorized', {
      style: {
        background: 'var(--black-elevated)',
        color: 'var(--text-primary)',
        fontSize: 'var(--text-base)',
        border: '1px solid var(--border-subtle)',
      },
    });
    return <Navigate to="/" replace />;
  }

  // Tab configuration
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'import', label: 'Import', icon: '📥' },
    { id: 'companies', label: 'Companies', icon: '🏢' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'logs', label: 'Logs', icon: '📋' },
  ];

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'import':
        return <ImportTab />;
      case 'companies':
        return <CompaniesTab />;
      case 'questions':
        return <QuestionsTab />;
      case 'logs':
        return <AuditLogsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--black-base)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
        {/* Header */}
        <header style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Admin Portal 🔐
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Manage questions, companies, and imports
          </p>
        </header>

        {/* Tab Navigation */}
        <nav style={{ marginBottom: 'var(--space-8)' }} aria-label="Admin portal tabs">
          <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  px-4 py-2 font-medium transition-all
                  ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-white shadow-md'
                      : 'text-text-secondary hover:text-text-primary'
                  }
                `}
                style={{
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--black-elevated)',
                  transitionDuration: 'var(--duration-fast)',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'var(--black-elevated-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'var(--black-elevated)';
                  }
                }}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span className="mr-2" aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default AdminPortal;
