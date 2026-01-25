import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FaStar, FaChevronRight, FaCheck } from 'react-icons/fa';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import { getCompanyTier } from '../../data/companyPriority';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * CompanyCard component with premium styling
 * Displays company information with hover effects, animations, and favorite button
 * Accessible with keyboard navigation and ARIA labels
 * 
 * Requirements: 3.3, 3.5, 3.7, 7.6, 7.7
 */
const CompanyCard = ({ company, onClick, index = 0, isFavorite = false, onToggleFavorite, isSelected = false }) => {
  const prefersReducedMotion = useReducedMotion();

  const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

  const handleKeyDown = (e) => {
    // Handle Enter and Space keys for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const tier = getCompanyTier(company.name);
  const tierVariantMap = {
    'S': 'tierS',
    'A': 'tierA',
    'Quant': 'quant',
    'India': 'india',
  };
  const tierVariant = tierVariantMap[tier] || 'default';

  // Get tier-specific gradient colors
  const tierGradients = {
    'S': 'from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/5',
    'A': 'from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5',
    'Quant': 'from-[var(--accent-warning)]/15 to-[var(--accent-warning)]/5',
    'India': 'from-[var(--accent-success)]/15 to-[var(--accent-success)]/5',
  };
  const gradientClass = tierGradients[tier] || 'from-[var(--bg-surface-2)] to-[var(--bg-surface)]';

  return (
    <MotionDiv
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      <Card
        onClick={onClick}
        onKeyDown={handleKeyDown}
        hoverable={false}
        role="button"
        tabIndex={0}
        aria-label={`View ${company.question_count || 0} questions for ${company.name}`}
        className={`
          p-[var(--space-4)] h-full flex flex-col cursor-pointer relative overflow-hidden group
          bg-[var(--bg-surface)] border border-[var(--border-subtle)]
          hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-2)]
          hover:shadow-[var(--elevation-2)]
          transition-all duration-[var(--duration-fast)]
          focus-visible:shadow-[var(--focus-ring)]
          ${isSelected ? 'ring-2 ring-[var(--accent-primary)] shadow-[var(--elevation-3)]' : ''}
        `}
      >
        {/* Background gradient effect - tier-based */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]`} aria-hidden="true" />

        {/* Favorite button - top right */}
        {onToggleFavorite && (
          <div className="absolute top-[var(--space-3)] right-[var(--space-3)] z-20">
            <Tooltip content={isFavorite ? "Remove from favorites" : "Add to favorites"}>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                aria-label={isFavorite ? `Remove ${company.name} from favorites` : `Add ${company.name} to favorites`}
                className={isFavorite ? 'text-[var(--accent-warning)]' : 'text-[var(--text-tertiary)]'}
              >
                <FaStar className={isFavorite ? 'fill-current' : ''} />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-[var(--space-3)] left-[var(--space-3)] z-30">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-[var(--elevation-2)]">
              <FaCheck className="text-white text-xs" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1">
          {/* Logo/Monogram - Enhanced */}
          <div className="mb-[var(--space-3)]">
            <div className="w-14 h-14 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--accent-primary-light)] to-[var(--bg-surface-2)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:border-[var(--border-brand)] group-hover:shadow-[var(--elevation-1)] transition-all duration-[var(--duration-fast)]">
              <span className="text-[var(--accent-primary)] text-xl font-bold">
                {company.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Company Name + Tier */}
          <div className="mb-[var(--space-2)]">
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-1)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate flex-1">
                {company.name}
              </h3>
            </div>
            {tier !== 'C' && tier !== 'B' && tierVariantMap[tier] && (
              <Badge variant={tierVariant} size="sm" className="mb-[var(--space-2)]">
                Tier {tier}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-[var(--space-1)] text-xs text-[var(--text-secondary)] mt-auto">
            {company.question_count !== undefined && company.question_count > 0 && (
              <div className="flex items-center gap-[var(--space-1_5)]">
                <span className="font-medium text-[var(--text-primary)]">
                  {company.question_count}
                </span>
                <span className="text-[var(--text-tertiary)]">
                  {company.question_count === 1 ? 'question' : 'questions'}
                </span>
              </div>
            )}
            {company.updated_at && (
              <div className="text-[var(--text-tertiary)]">
                Updated {format(new Date(company.updated_at), 'MMM d')}
              </div>
            )}
          </div>

          {/* Hover arrow indicator */}
          <div className="absolute bottom-[var(--space-4)] right-[var(--space-4)] opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-fast)]">
            <FaChevronRight className="text-[var(--accent-primary)] text-sm" aria-hidden="true" />
          </div>
        </div>

        {/* Hover bottom border indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-[var(--duration-normal)] origin-left" aria-hidden="true" />
      </Card>
    </MotionDiv>
  );
};

export default CompanyCard;
