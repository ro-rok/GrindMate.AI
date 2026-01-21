/**
 * Container component with max-width and padding
 * Provides consistent content width and spacing across pages
 */
const Container = ({
  children,
  size = 'default',
  className = '',
  as: Component = 'div'
}) => {
  const sizeStyles = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    lg: 'max-w-[1440px]',
    full: 'max-w-full'
  };

  const baseStyles = 'mx-auto px-4 sm:px-6 lg:px-8';
  const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${className}`;

  return (
    <Component className={combinedClassName}>
      {children}
    </Component>
  );
};

export default Container;
