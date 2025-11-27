/**
 * Vector DB Service
 * 
 * Main export for vector database operations
 */

export * from './types.js';
export * from './vector-client.interface.js';
export * from './vector-client.factory.js';
export { getVectorClient, createVectorClient } from './vector-client.factory.js';

