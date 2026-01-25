import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * SegmentedControl component
 * Premium segmented control for filters (Top/Quant/India/All)
 */
function SegmentedControl({
  value,
  onChange,
  options = [],
  className = '',
  size = 'md',
}) {
  const prefersReducedMotion = useReducedMotion();

  const sizeStyles = {
    sm: 'h-8 text-sm px-3',
    md: 'h-10 text-base px-4',
    lg: 'h-12 text-lg px-5'
  };

  const activeIndex = options.findIndex(opt => 
    typeof opt === 'string' ? opt === value : opt.value === value
  );

  const getOptionValue = (opt) => typeof opt === 'string' ? opt : opt.value;
  const getOptionLabel = (opt) => typeof opt === 'string' ? opt : opt.label;

  return (
    <div 
      className={`relative inline-flex bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-1 gap-1 ${className}`}
      role="tablist"
      aria-label="Filter options"
    >
      {options.map((option, index) => {
        const optionValue = getOptionValue(option);
        const optionLabel = getOptionLabel(option);
        const isActive = optionValue === value;

        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(optionValue)}
            className={`
              relative z-10 px-4 py-2 rounded-[var(--radius-sm)] 
              font-medium transition-colors duration-[var(--duration-fast)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]
              ${sizeStyles[size]}
              ${isActive 
                ? 'text-[var(--text-primary)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {optionLabel}
          </button>
        );
      })}
      
      {/* Active indicator */}
      {activeIndex >= 0 && (
        <motion.div
          className="absolute inset-y-1 bg-[var(--bg-surface-2)] border border-[var(--border-brand)] rounded-[var(--radius-sm)] shadow-[var(--elevation-1)]"
          initial={prefersReducedMotion ? {} : false}
          layoutId="segmented-indicator"
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          style={{
            left: `${(activeIndex / options.length) * 100}%`,
            width: `${(1 / options.length) * 100}%`
          }}
        />
      )}
    </div>
  );
}

export default SegmentedControl;
