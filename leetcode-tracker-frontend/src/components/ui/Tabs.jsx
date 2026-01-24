import { useState, createContext, useContext } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Tabs context for managing active tab state
 */
const TabsContext = createContext({
  activeTab: null,
  setActiveTab: () => {},
});

/**
 * Tabs component
 * Accessible tab navigation for filtering (Top/Quant/India/All)
 */
function Tabs({ children, defaultValue, value, onChange, className = '' }) {
  const [internalValue, setInternalValue] = useState(defaultValue || null);
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalValue;
  
  const setActiveTab = (newValue) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`flex gap-1 ${className}`} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tab component
 */
function Tab({ value, children, disabled = false, className = '' }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const prefersReducedMotion = useReducedMotion();
  const isActive = activeTab === value;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const baseStyles = 'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-base';
  const activeStyles = isActive
    ? 'bg-accent-primary text-white shadow-md'
    : 'bg-black-elevated text-text-secondary hover:text-text-primary hover:bg-black-elevated-hover border border-border-subtle';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`${baseStyles} ${activeStyles} ${disabledStyles} ${className}`}
    >
      {children}
    </button>
  );
}

Tabs.Tab = Tab;

export default Tabs;
