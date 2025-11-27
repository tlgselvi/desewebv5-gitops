/**
 * Response Payload Optimization Utilities
 * Helps optimize API responses by reducing payload size and enabling lazy loading
 */

import { logger } from './logger.js';

/**
 * Response field selection options
 */
export interface FieldSelection {
  fields?: string[]; // Only include these fields
  exclude?: string[]; // Exclude these fields
  include?: string[]; // Always include these fields (in addition to fields)
}

/**
 * Select only specified fields from an object
 */
export function selectFields<T extends Record<string, unknown>>(
  obj: T,
  selection: FieldSelection
): Partial<T> {
  if (!obj) return obj;

  const { fields, exclude, include } = selection;

  // If fields specified, use them as base
  if (fields && fields.length > 0) {
    const selected: Partial<T> = {};
    fields.forEach((field) => {
      if (obj[field] !== undefined) {
        selected[field] = obj[field];
      }
    });

    // Add include fields
    if (include) {
      include.forEach((field) => {
        if (obj[field] !== undefined) {
          selected[field] = obj[field];
        }
      });
    }

    // Remove exclude fields
    if (exclude) {
      exclude.forEach((field) => {
        delete selected[field];
      });
    }

    return selected;
  }

  // No fields specified, exclude only
  if (exclude && exclude.length > 0) {
    const selected = { ...obj };
    exclude.forEach((field) => {
      delete selected[field];
    });
    return selected;
  }

  return obj;
}

/**
 * Select fields from array of objects
 */
export function selectFieldsFromArray<T extends Record<string, unknown>>(
  array: T[],
  selection: FieldSelection
): Partial<T>[] {
  return array.map((item) => selectFields(item, selection));
}

/**
 * Lazy load configuration
 */
export interface LazyLoadConfig {
  enabled: boolean;
  fields?: string[]; // Fields to lazy load
  loader?: (ids: string[]) => Promise<Record<string, unknown>[]>; // Loader function
}

/**
 * Remove lazy load fields and return lazy load references
 */
export function prepareLazyLoad<T extends Record<string, unknown>>(
  obj: T,
  config: LazyLoadConfig
): { data: Partial<T>; lazyLoad?: { field: string; id: string }[] } {
  if (!config.enabled || !config.fields) {
    return { data: obj };
  }

  const data = { ...obj };
  const lazyLoad: { field: string; id: string }[] = [];

  config.fields.forEach((field) => {
    if (data[field]) {
      const value = data[field];
      
      // If it's an object with id, store reference
      if (typeof value === 'object' && value !== null && 'id' in value) {
        lazyLoad.push({ field, id: String(value.id) });
        delete data[field];
      } else if (typeof value === 'string') {
        // Assume it's an ID reference
        lazyLoad.push({ field, id: value });
        delete data[field];
      }
    }
  });

  return { data, lazyLoad: lazyLoad.length > 0 ? lazyLoad : undefined };
}

/**
 * Response pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Optimize response payload size
 * - Remove null/undefined values (optional)
 * - Compress nested objects (optional)
 * - Apply field selection
 */
export function optimizePayload<T>(
  data: T | T[],
  options: {
    removeNulls?: boolean;
    fieldSelection?: FieldSelection;
    compressNested?: boolean;
  } = {}
): T | T[] {
  const { removeNulls = false, fieldSelection, compressNested = false } = options;

  if (Array.isArray(data)) {
    return data.map((item) => optimizePayload(item, options)) as T[];
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  let optimized = data as Record<string, unknown>;

  // Apply field selection
  if (fieldSelection) {
    optimized = selectFields(optimized as Record<string, unknown>, fieldSelection) as T;
  }

  // Remove null/undefined values
  if (removeNulls) {
    const cleaned: Record<string, unknown> = {};
    Object.entries(optimized).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });
    optimized = cleaned as T;
  }

  return optimized;
}

/**
 * Response compression levels
 */
export type CompressionLevel = 'none' | 'minimal' | 'aggressive';

/**
 * Compress response based on level
 */
export function compressResponse<T>(
  data: T,
  level: CompressionLevel = 'minimal'
): T {
  if (level === 'none') {
    return data;
  }

  // Minimal: remove nulls and empty arrays
  if (level === 'minimal') {
    return removeEmptyValues(data);
  }

  // Aggressive: remove nulls, empty arrays, and optional fields with default values
  if (level === 'aggressive') {
    return removeEmptyValues(data, true);
  }

  return data;
}

/**
 * Remove empty values from object/array
 */
function removeEmptyValues<T>(data: T, aggressive = false): T {
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => removeEmptyValues(item, aggressive)) as T;
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const cleaned: Record<string, unknown> = {};

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    // Skip null, undefined, empty string
    if (value === null || value === undefined || value === '') {
      return;
    }

    // Aggressive: skip empty arrays/objects
    if (aggressive) {
      if (Array.isArray(value) && value.length === 0) {
        return;
      }
      if (typeof value === 'object' && Object.keys(value).length === 0) {
        return;
      }
    }

    // Recursively clean nested objects
    if (typeof value === 'object') {
      const cleanedValue = removeEmptyValues(value, aggressive);
      cleaned[key] = cleanedValue;
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned as T;
}

/**
 * Build optimized API response
 */
export function buildOptimizedResponse<T>(options: {
  data: T | T[];
  pagination?: PaginationMeta;
  fieldSelection?: FieldSelection;
  compression?: CompressionLevel;
  removeNulls?: boolean;
}): {
  data: T | T[];
  pagination?: PaginationMeta;
  meta?: {
    compressed: boolean;
    fieldSelection?: string[];
  };
} {
  const {
    data,
    pagination,
    fieldSelection,
    compression = 'minimal',
    removeNulls = false,
  } = options;

  // Optimize payload
  let optimized = optimizePayload(data, {
    removeNulls,
    fieldSelection,
  });

  // Compress if needed
  if (compression !== 'none') {
    optimized = compressResponse(optimized, compression);
  }

  const response: {
    data: T | T[];
    pagination?: PaginationMeta;
    meta?: {
      compressed: boolean;
      fieldSelection?: string[];
    };
  } = {
    data: optimized,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  if (compression !== 'none' || fieldSelection) {
    response.meta = {
      compressed: compression !== 'none',
      fieldSelection: fieldSelection?.fields,
    };
  }

  return response;
}

