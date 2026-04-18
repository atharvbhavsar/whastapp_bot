'use client';

import React from 'react';

/**
 * CivicPulse Button — reusable component migrated from frontend/src/components/ui/Button.jsx
 * Maps variant props to .civic-app scoped CSS classes from globals.css
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled = false,
  onClick,
  type = 'button' as 'button' | 'submit' | 'reset',
  style = {} as React.CSSProperties,
  title,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  title?: string;
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'secondary': return 'btn-secondary';
      case 'danger': return 'btn-secondary';
      default: return '';
    }
  };

  let variantStyles: React.CSSProperties = {};
  if (variant === 'danger') {
    variantStyles.color = 'var(--danger)';
    variantStyles.borderColor = 'var(--danger-light)';
  } else if (variant === 'icon' || variant === 'ghost') {
    variantStyles.background = 'transparent';
    variantStyles.color = 'inherit';
    variantStyles.padding = '0.5rem';
    variantStyles.border = 'none';
  }

  const computedStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    ...variantStyles,
    ...style,
    width: fullWidth ? '100%' : style.width,
    opacity: disabled ? 0.6 : style.opacity,
    cursor: disabled ? 'not-allowed' : style.cursor || 'pointer',
  };

  if (size === 'sm') {
    computedStyles.padding = '0.4rem 0.8rem';
    computedStyles.fontSize = '0.85rem';
  }

  return (
    <button
      type={type}
      className={`${getVariantClass()} ${className}`.trim()}
      style={computedStyles}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};
