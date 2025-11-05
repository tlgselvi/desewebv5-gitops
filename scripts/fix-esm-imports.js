#!/usr/bin/env node
/**
 * Fix ESM directory imports in compiled output
 * Replaces directory imports like 'from "./ws"' with 'from "./ws/index.js"' or proper file paths
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '..', 'dist');

async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function findIndexFile(dir) {
  try {
    const files = await readdir(dir);
    const indexFile = files.find(f => f === 'index.js' || f === 'index.mjs');
    return indexFile ? join(dir, indexFile) : null;
  } catch {
    return null;
  }
}

async function fixImportsInFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf-8');
    const originalContent = content;
    const fileDir = dirname(filePath);

    // Match imports like: from './ws' or from '@/ws' or from '../ws'
    // Exclude those ending with .js, .json, .mjs, .cjs
    const importRegex = /from\s+['"]([^'"]+)['"]/g;

    let modified = false;
    const replacements = [];

    // First pass: find all imports that need fixing
    for (const match of content.matchAll(importRegex)) {
      const importPath = match[1];
      
      // Skip if already has extension or is a package import (doesn't start with . or /)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }
      
      // Skip if already has extension
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || 
          importPath.endsWith('.mjs') || importPath.endsWith('.cjs')) {
        continue;
      }

      const resolvedPath = importPath.startsWith('/')
        ? join(DIST_DIR, importPath)
        : join(fileDir, importPath);

      // Check if it's a directory
      if (await isDirectory(resolvedPath)) {
        // First try to find index.js
        const indexFile = await findIndexFile(resolvedPath);
        if (indexFile) {
          const newImportPath = `${importPath}/index.js`.replace(/\\/g, '/');
          replacements.push({ from: match[0], to: match[0].replace(importPath, newImportPath) });
          modified = true;
        } else {
          // If no index.js, find the main file (usually gateway.js or same name as directory)
          try {
            const files = await readdir(resolvedPath);
            const dirName = importPath.split('/').pop() || importPath.split('\\').pop();
            // Try to find gateway.js or {dirname}.js
            const mainFile = files.find(f => 
              f === 'gateway.js' || 
              f === `${dirName}.js` || 
              f === 'index.js' ||
              (f.endsWith('.js') && files.length === 1)
            );
            if (mainFile) {
              const newImportPath = `${importPath}/${mainFile}`.replace(/\\/g, '/');
              replacements.push({ from: match[0], to: match[0].replace(importPath, newImportPath) });
              modified = true;
            } else {
              // Default to gateway.js for ws directory
              const defaultFile = importPath.includes('ws') ? 'gateway.js' : 'index.js';
              const newImportPath = `${importPath}/${defaultFile}`.replace(/\\/g, '/');
              replacements.push({ from: match[0], to: match[0].replace(importPath, newImportPath) });
              modified = true;
            }
          } catch {
            // Fallback to index.js
            const newImportPath = `${importPath}/index.js`.replace(/\\/g, '/');
            replacements.push({ from: match[0], to: match[0].replace(importPath, newImportPath) });
            modified = true;
          }
        }
      } else {
        // It's a file without extension, add .js
        if (!extname(resolvedPath)) {
          const newImportPath = `${importPath}.js`;
          replacements.push({ from: match[0], to: match[0].replace(importPath, newImportPath) });
          modified = true;
        }
      }
    }

    // Apply all replacements
    if (modified) {
      for (const { from, to } of replacements) {
        content = content.replace(from, to);
      }
      await writeFile(filePath, content, 'utf-8');
      console.log(`✅ Fixed imports in: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function fixAllFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await fixAllFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        await fixImportsInFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing ESM directory imports in dist/...');
  
  try {
    await fixAllFiles(DIST_DIR);
    console.log('✅ ESM import fix completed!');
  } catch (error) {
    console.error('❌ Failed to fix imports:', error);
    process.exit(1);
  }
}

main();
