import React from 'react';

/**
 * A highly reusable Button component replacing manually styled <button> elements.
 * Supports standardized variants, scaling configurations directly mapped 
 * to global CSS variables from index.css.
 */
export const Button = ({
  children,
  variant = 'primary', // primary, secondary, ghost, danger, icon
  size = 'md',         // sm, md, lg
  fullWidth = false,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  title,
}) => {
  // Map variant to existing index.css classes when possible, or compute custom styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'danger':
        return 'btn-secondary'; // Base it on secondary
      case 'ghost':
      case 'icon':
      default:
        // 'icon' or 'ghost' buttons don't need background blocks by default
        return ''; 
    }
  };

  // Base raw styles that index.css classes don't automatically provide
  const computedStyles = {
    ...style,
    width: fullWidth ? '100%' : style.width,
    opacity: disabled ? 0.6 : style.opacity,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  // Additional variants that don't have CSS classes yet
  if (variant === 'danger') {
    computedStyles.color = 'var(--danger)';
    computedStyles.borderColor = 'var(--danger-light)';
  } else if (variant === 'icon' || variant === 'ghost') {
    computedStyles.background = 'transparent';
    computedStyles.color = 'inherit';
    computedStyles.padding = '0.5rem';
    computedStyles.border = 'none';
  }

  // Handle explicit sizing overrides
  if (size === 'sm') {
    computedStyles.padding = '0.4rem 0.8rem';
    computedStyles.fontSize = '0.85rem';
  }

  return (
    <button
      type={type}
      className={`${getVariantStyles()} ${className}`.trim()}
      style={computedStyles}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};
