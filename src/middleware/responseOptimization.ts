/**
 * Response Optimization Middleware
 * Optimizes API responses by applying payload compression and field selection
 */

import { Request, Response, NextFunction } from 'express';
import { 
  buildOptimizedResponse, 
  selectFields, 
  type FieldSelection,
  type CompressionLevel 
} from '@/utils/response-optimizer.js';
import { logger } from '@/utils/logger.js';

/**
 * Query parameter parsing for response optimization
 */
interface OptimizationOptions {
  fields?: string; // Comma-separated field list
  exclude?: string; // Comma-separated exclusion list
  compression?: CompressionLevel;
  removeNulls?: boolean;
}

/**
 * Parse optimization options from query parameters
 */
function parseOptimizationOptions(req: Request): OptimizationOptions {
  const fields = req.query.fields as string | undefined;
  const exclude = req.query.exclude as string | undefined;
  const compression = (req.query.compression as CompressionLevel | undefined) || 'minimal';
  const removeNulls = req.query.removeNulls === 'true';

  return {
    fields: fields?.split(',').map(f => f.trim()),
    exclude: exclude?.split(',').map(f => f.trim()),
    compression,
    removeNulls,
  };
}

/**
 * Response optimization middleware
 * 
 * Usage:
 *   - Add ?fields=id,name,email to select specific fields
 *   - Add ?exclude=password,sensitive to exclude fields
 *   - Add ?compression=aggressive for aggressive compression
 *   - Add ?removeNulls=true to remove null values
 */
export function responseOptimizationMiddleware(
  options: {
    defaultCompression?: CompressionLevel;
    enableFieldSelection?: boolean;
  } = {}
) {
  const {
    defaultCompression = 'minimal',
    enableFieldSelection = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    
    res.json = function (data: any) {
      try {
        const opts = parseOptimizationOptions(req);
        
        // Build field selection if enabled
        let fieldSelection: FieldSelection | undefined;
        if (enableFieldSelection && (opts.fields || opts.exclude)) {
          fieldSelection = {
            fields: opts.fields,
            exclude: opts.exclude,
          };
        }

        // Apply optimization
        const optimized = buildOptimizedResponse({
          data,
          compression: opts.compression || defaultCompression,
          removeNulls: opts.removeNulls || false,
          fieldSelection,
        });

        return originalJson(optimized);
      } catch (error) {
        logger.warn('Response optimization failed, returning original response', { error });
        return originalJson(data);
      }
    };

    next();
  };
}

/**
 * Conditional response optimization based on response size
 */
export function conditionalResponseOptimization(
  threshold: number = 10240 // 10KB default
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    
    res.json = function (data: any) {
      try {
        // Estimate payload size
        const payloadSize = JSON.stringify(data).length;
        
        // Only optimize if payload is above threshold
        if (payloadSize > threshold) {
          const optimized = buildOptimizedResponse({
            data,
            compression: 'minimal',
            removeNulls: true,
          });
          
          logger.debug('Response optimized due to size', {
            originalSize: payloadSize,
            path: req.path,
          });
          
          return originalJson(optimized);
        }

        return originalJson(data);
      } catch (error) {
        logger.warn('Conditional response optimization failed', { error });
        return originalJson(data);
      }
    };

    next();
  };
}

