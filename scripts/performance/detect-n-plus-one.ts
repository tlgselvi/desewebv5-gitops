#!/usr/bin/env tsx
/**
 * N+1 Query Detection Script
 * 
 * Detects potential N+1 query problems by analyzing service files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '../../src/utils/logger.js';

interface NPlusOnePattern {
  file: string;
  line: number;
  code: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Check if a line contains a database query
 */
function containsQuery(line: string): boolean {
  const queryPatterns = [
    /db\.query\./,
    /db\.select/,
    /db\.insert/,
    /db\.update/,
    /db\.delete/,
    /await.*\.findFirst/,
    /await.*\.findMany/,
    /await.*\.findUnique/,
  ];
  
  return queryPatterns.some(pattern => pattern.test(line));
}

/**
 * Check if a line is inside a loop
 */
function isInLoop(lines: string[], currentIndex: number): boolean {
  // Check backwards for loop keywords
  for (let i = currentIndex; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Found a loop
    if (/^\s*(for|while|\.map\(|\.forEach\(|\.filter\(|\.reduce\()/.test(line)) {
      return true;
    }
    
    // Found a function boundary (not in loop)
    if (/^\s*(function|async\s+function|const\s+\w+\s*=\s*(async\s*)?\(|export\s+(async\s+)?function)/.test(line)) {
      return false;
    }
  }
  
  return false;
}

/**
 * Analyze a TypeScript file for N+1 patterns
 */
function analyzeFile(filePath: string): NPlusOnePattern[] {
  const patterns: NPlusOnePattern[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains a query
      if (containsQuery(line)) {
        // Check if it's inside a loop
        if (isInLoop(lines, i)) {
          // Check severity based on context
          let severity: 'high' | 'medium' | 'low' = 'medium';
          
          if (line.includes('.findFirst') || line.includes('.findUnique')) {
            severity = 'high'; // Single record queries in loops are high risk
          } else if (line.includes('.findMany')) {
            severity = 'medium'; // Multiple records might be intentional
          }
          
          patterns.push({
            file: filePath,
            line: i + 1,
            code: line.trim(),
            severity,
            description: `Potential N+1 query detected: database query inside loop`,
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Error analyzing file ${filePath}`, { error });
  }
  
  return patterns;
}

/**
 * Recursively find all TypeScript service files
 */
function findServiceFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(file)) {
        findServiceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
      // Only analyze service files
      if (filePath.includes('service') || filePath.includes('modules')) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * Main detection function
 */
async function detectNPlusOne(): Promise<void> {
  logger.info('Starting N+1 query detection...');
  
  const serviceFiles = findServiceFiles('./src');
  logger.info(`Found ${serviceFiles.length} service files to analyze`);
  
  const allPatterns: NPlusOnePattern[] = [];
  
  for (const file of serviceFiles) {
    const patterns = analyzeFile(file);
    if (patterns.length > 0) {
      allPatterns.push(...patterns);
      logger.warn(`Found ${patterns.length} potential N+1 patterns in ${file}`);
    }
  }
  
  // Group by severity
  const highSeverity = allPatterns.filter(p => p.severity === 'high');
  const mediumSeverity = allPatterns.filter(p => p.severity === 'medium');
  const lowSeverity = allPatterns.filter(p => p.severity === 'low');
  
  logger.info('N+1 detection complete', {
    total: allPatterns.length,
    high: highSeverity.length,
    medium: mediumSeverity.length,
    low: lowSeverity.length,
  });
  
  if (allPatterns.length > 0) {
    logger.warn('Potential N+1 patterns found:', {
      high: highSeverity,
      medium: mediumSeverity,
      low: lowSeverity,
    });
  } else {
    logger.info('No N+1 patterns detected');
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: serviceFiles.length,
    totalPatterns: allPatterns.length,
    bySeverity: {
      high: highSeverity.length,
      medium: mediumSeverity.length,
      low: lowSeverity.length,
    },
    patterns: allPatterns,
  };
  
  // Write report to file
  const fs = await import('fs/promises');
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile(
    'reports/n-plus-one-detection.json',
    JSON.stringify(report, null, 2)
  );
  
  logger.info('Report saved to reports/n-plus-one-detection.json');
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('detect-n-plus-one')) {
  detectNPlusOne()
    .then(() => {
      logger.info('N+1 detection completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('N+1 detection failed', { error });
      process.exit(1);
    });
}

export { detectNPlusOne, analyzeFile, findServiceFiles };

