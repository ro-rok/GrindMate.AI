import { motion } from 'framer-motion';
import { FaBuilding, FaChevronRight } from 'react-icons/fa';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * CompanyCard component with premium styling
 * Displays company information with hover effects, animations, and favorite button
 * Accessible with keyboard navigation and ARIA labels
 * 
 * Requirements: 3.3, 3.5, 3.7, 7.6, 7.7
 */
const CompanyCard = ({ company, onClick, index = 0, isFavorite = false, onToggleFavorite }) => {
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
        className="p-6 h-full flex flex-col justify-between cursor-pointer relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-base"
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

        {/* Content */}
        <div className="relative z-10">
          {/* Company icon and name */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-black-elevated-hover border border-border-subtle flex items-center justify-center group-hover:border-accent-primary/50 transition-colors" aria-hidden="true">
                <FaBuilding className="text-accent-primary text-xl" />
              </div>
              <div className="pr-8">
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  {company.name}
                </h3>
                {company.question_count !== undefined && (
                  <p className="text-sm text-text-secondary">
                    {company.question_count} {company.question_count === 1 ? 'question' : 'questions'}
                  </p>
                )}
              </div>
            </div>
            <FaChevronRight className="text-text-tertiary group-hover:text-accent-primary group-hover:translate-x-1 transition-all" aria-hidden="true" />
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
