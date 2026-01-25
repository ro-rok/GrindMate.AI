import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaStar, FaExternalLinkAlt, FaThumbtack } from 'react-icons/fa';
import { format } from 'date-fns';
import Badge from '../ui/Badge';
import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';
import { getCompanyTier } from '../../data/companyPriority';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getCompanyIdentifier } from '../../utils/slugify';

/**
 * CompanyRow component
 * Dense row layout for company list with tier badges and hover actions
 */
function CompanyRow({
  company,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  onPin,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const tier = getCompanyTier(company.name);
  const tierVariantMap = {
    'S': 'tierS',
    'A': 'tierA',
    'Quant': 'quant',
    'India': 'india',
    'B': 'default',
    'C': 'default',
  };
  const tierVariant = tierVariantMap[tier] || 'default';

  // Get company category tags
  const getCategoryTags = () => {
    const tags = [];
    if (tier === 'Quant') tags.push('Quant');
    if (tier === 'India') tags.push('India');
    if (['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'].includes(company.name)) {
      tags.push('Big Tech');
    }
    if (['Stripe', 'Coinbase', 'PayPal', 'Razorpay', 'PhonePe'].includes(company.name)) {
      tags.push('Fintech');
    }
    return tags;
  };

  const categoryTags = getCategoryTags();
  const companySlug = getCompanyIdentifier(company);

  const MotionRow = prefersReducedMotion ? 'div' : motion.div;

  return (
    <MotionRow
      className={`
        group flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-1_5)]
        bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]
        hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-2)]
        transition-all duration-[var(--duration-fast)]
        cursor-pointer focus-visible:shadow-[var(--focus-ring)]
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={prefersReducedMotion ? {} : { y: -1 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Logo/Monogram - Enhanced */}
      <div className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--accent-primary-light)] to-[var(--bg-surface-2)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:border-[var(--border-brand)] group-hover:shadow-[var(--elevation-1)] transition-all">
        <span className="text-[var(--accent-primary)] text-sm font-bold">
          {company.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Company Name + Tier + Metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-0_5)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {company.name}
          </h3>
          {tier !== 'C' && tier !== 'B' && (
            <Badge variant={tierVariant} size="sm">
              {tier}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-[var(--space-2)] text-xs text-[var(--text-secondary)] flex-wrap">
          {company.question_count !== undefined && company.question_count > 0 && (
            <span className="whitespace-nowrap">
              {company.question_count} {company.question_count === 1 ? 'question' : 'questions'}
            </span>
          )}
          {company.updated_at && (
            <>
              {company.question_count !== undefined && company.question_count > 0 && <span>•</span>}
              <span className="whitespace-nowrap text-[var(--text-tertiary)]">
                updated {format(new Date(company.updated_at), 'MMM d')}
              </span>
            </>
          )}
          {categoryTags.length > 0 && (
            <>
              {(company.question_count !== undefined && company.question_count > 0) || company.updated_at ? <span>•</span> : null}
              <div className="flex items-center gap-[var(--space-1)]">
                {categoryTags.map((tag, idx) => (
                  <span key={idx} className="px-[var(--space-1_5)] py-[var(--space-0_5)] bg-[var(--bg-surface-2)] rounded-[var(--radius-sm)] text-[var(--text-tertiary)]">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions - Reveal on hover/focus */}
      <div className={`flex items-center gap-1 transition-opacity duration-[var(--duration-fast)] ${isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}>
        {onToggleFavorite && (
          <Tooltip content={isFavorite ? "Remove from favorites" : "Add to favorites"}>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={isFavorite ? 'text-[var(--accent-warning)]' : ''}
            >
              <FaStar className={isFavorite ? 'fill-current' : ''} />
            </IconButton>
          </Tooltip>
        )}
        
        {onPin && (
          <Tooltip content="Pin company">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              aria-label="Pin company"
            >
              <FaThumbtack />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip content="Open company">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label="Open company"
          >
            <FaExternalLinkAlt />
          </IconButton>
        </Tooltip>
      </div>
    </MotionRow>
  );
}

export default CompanyRow;
