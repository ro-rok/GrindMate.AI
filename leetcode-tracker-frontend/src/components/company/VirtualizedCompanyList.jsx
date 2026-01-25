import * as ReactWindow from 'react-window';
import { useEffect, useState } from 'react';
import CompanyRow from './CompanyRow';

const { List } = ReactWindow;

/**
 * VirtualizedCompanyList component
 * Dense virtualized list for companies using react-window
 * Uses dynamic height to prevent nested scrolling
 */
function VirtualizedCompanyList({
  companies,
  onCompanyClick,
  favorites,
  onToggleFavorite,
  selectedCompanyId,
  itemHeight = 72, // Dense row height (updated to match reduced spacing)
}) {
  const [listHeight, setListHeight] = useState(600);

  useEffect(() => {
    // Calculate height based on viewport minus header/filters, but cap at reasonable max
    // This allows page-level scrolling instead of nested scroll
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const headerAndFiltersHeight = 300; // Approximate space for header and filters
      const availableHeight = viewportHeight - headerAndFiltersHeight;
      // Use available height but don't exceed content height
      const contentHeight = companies.length * itemHeight;
      const height = Math.min(availableHeight, contentHeight, 1200); // Max 1200px
      setListHeight(Math.max(height, 400)); // Min 400px
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [companies.length, itemHeight]);

  const Row = ({ index, style }) => {
    const company = companies[index];
    if (!company) return null;

    const companyId = company.id || company._id;

    return (
      <div style={style} className="px-[var(--space-2)]">
        <CompanyRow
          company={company}
          onClick={() => onCompanyClick(company)}
          isFavorite={favorites.includes(companyId)}
          onToggleFavorite={() => onToggleFavorite(companyId)}
        />
      </div>
    );
  };
  
  return (
    <div className="w-full">
      <List
        rowComponent={Row}
        rowCount={companies.length}
        rowHeight={itemHeight}
        rowProps={{}}
        style={{ height: listHeight, width: '100%' }}
        overscanCount={5}
        className="virtualized-list"
      />
    </div>
  );
}

export default VirtualizedCompanyList;
