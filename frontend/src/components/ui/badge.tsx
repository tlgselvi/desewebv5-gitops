import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'destructive' | 'secondary';
}

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

