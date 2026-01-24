import { List } from 'react-window';
import CompanyCard from './CompanyCard';

/**
 * VirtualizedCompanyList component
 * Efficiently renders large lists of companies using react-window
 * Uses List component from react-window v2.2.5
 */
function VirtualizedCompanyList({
  companies,
  onCompanyClick,
  favorites,
  onToggleFavorite,
  selectedCompanyId,
  itemHeight = 200,
}) {
  const Row = ({ index, style }) => {
    const company = companies[index];
    if (!company) return null;

    return (
      <div style={style} className="px-2">
        <CompanyCard
          company={company}
          onClick={() => onCompanyClick(company)}
          isFavorite={favorites.includes(company.id || company._id)}
          onToggleFavorite={(e) => {
            e.stopPropagation();
            onToggleFavorite(company.id || company._id);
          }}
          isSelected={selectedCompanyId === (company.id || company._id)}
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
        style={{ height: 600, width: '100%' }}
        className="virtualized-list"
      />
    </div>
  );
}

export default VirtualizedCompanyList;
