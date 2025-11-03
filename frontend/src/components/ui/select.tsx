'use client';
import React, { useState } from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return <div className="relative">{children}</div>;
}

export function SelectTrigger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-muted-foreground">{placeholder}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
}

export function SelectContent({ children }: SelectContentProps) {
  return (
    <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onSelect?: (value: string) => void;
}

export function SelectItem({ value, children, onSelect }: SelectItemProps) {
  return (
    <div
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </div>
  );
}

