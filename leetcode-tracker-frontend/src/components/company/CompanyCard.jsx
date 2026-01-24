import { motion } from 'framer-motion';
import { FaBuilding, FaChevronRight, FaCheck } from 'react-icons/fa';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
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

  const hoverAnimation = prefersReducedMotion ? {} : {
    scale: 1.03,
    boxShadow: '0 0 30px rgba(14, 165, 233, 0.4)',
  };

  const itemVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }
    }
  };

  const handleKeyDown = (e) => {
    // Handle Enter and Space keys for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <MotionDiv
      variants={itemVariants}
      whileHover={hoverAnimation}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full"
    >
      <Card
        onClick={onClick}
        onKeyDown={handleKeyDown}
        hoverable={false}
        role="button"
        tabIndex={0}
        aria-label={`View ${company.question_count || 0} questions for ${company.name}`}
        className={`p-6 h-full flex flex-col justify-between cursor-pointer relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-base ${
          isSelected ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-black-base shadow-[var(--elevation-glow)]' : ''
        }`}
      >
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="absolute top-4 right-4 z-20 text-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-elevated rounded"
            aria-label={isFavorite ? `Remove ${company.name} from favorites` : `Add ${company.name} to favorites`}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-4 left-4 z-30">
            <div className="w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center">
              <FaCheck className="text-white text-xs" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Company icon and name */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Logo monogram */}
              <div className="w-12 h-12 rounded-full bg-black-elevated-hover border border-border-soft flex items-center justify-center group-hover:border-accent-primary/50 transition-colors flex-shrink-0" aria-hidden="true">
                <span className="text-accent-primary text-lg font-bold">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="pr-8 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                    {company.name}
                  </h3>
                  {(() => {
                    const tier = getCompanyTier(company.name);
                    const tierVariantMap = {
                      'S': 'tierS',
                      'A': 'tierA',
                      'Quant': 'quant',
                      'India': 'india',
                    };
                    return tier !== 'Low' && tierVariantMap[tier] && (
                      <Pill variant={tierVariantMap[tier]} size="sm">
                        {tier}
                      </Pill>
                    );
                  })()}
                </div>
                {company.question_count !== undefined && (
                  <p className="text-sm text-text-secondary">
                    {company.question_count} {company.question_count === 1 ? 'question' : 'questions'}
                  </p>
                )}
              </div>
            </div>
            <FaChevronRight className="text-text-tertiary group-hover:text-accent-primary group-hover:translate-x-1 transition-all flex-shrink-0" aria-hidden="true" />
          </div>

          {/* Company metadata */}
          {(company.frequency || company.recent_questions) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {company.frequency && (
                <Badge variant="primary" size="sm">
                  Frequency: {company.frequency}
                </Badge>
              )}
              {company.recent_questions && (
                <Badge variant="default" size="sm">
                  {company.recent_questions} recent
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" aria-hidden="true" />
      </Card>
    </MotionDiv>
  );
};

export default CompanyCard;
