/**
 * Global Search Component
 * Provides global search functionality with suggestions
 */

"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useKeyboardNavigation, COMMON_SHORTCUTS } from '@/hooks/useKeyboardNavigation';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'page' | 'module' | 'feature';
  href: string;
}

export interface GlobalSearchProps {
  onSearch?: (query: string) => Promise<SearchResult[]>;
  placeholder?: string;
}

export function GlobalSearch({ 
  onSearch,
  placeholder = "Ara... (Ctrl+K veya /)"
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useKeyboardNavigation([
    {
      key: 'k',
      ctrlKey: true,
      handler: () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      description: 'Open search',
    },
    {
      key: '/',
      handler: () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      description: 'Open search',
    },
    {
      key: 'Escape',
      handler: () => {
        if (isOpen) {
          setIsOpen(false);
          setQuery('');
        }
      },
    },
  ]);

  useEffect(() => {
    if (query.trim() && onSearch) {
      setIsLoading(true);
      onSearch(query).then((searchResults) => {
        setResults(searchResults);
        setIsLoading(false);
      });
    } else {
      setResults([]);
    }
  }, [query, onSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
        aria-label="Ara"
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
      </Button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      role="search"
      aria-label="Global search"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          data-search-input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Arama sorgusu"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={results.length > 0}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={() => {
            setIsOpen(false);
            setQuery('');
          }}
          aria-label="Aramayı kapat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {isOpen && (query.trim() || results.length > 0) && (
        <div
          id="search-results"
          className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-md border bg-popover shadow-lg"
          role="listbox"
          aria-label="Arama sonuçları"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aranıyor...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((result) => (
                <li key={result.id}>
                  <a
                    href={result.href}
                    className="flex flex-col gap-1 px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="font-medium">{result.title}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">
                        {result.description}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Sonuç bulunamadı
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

