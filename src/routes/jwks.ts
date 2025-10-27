import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// JWT/JWKS endpoint for key rotation
router.get('/.well-known/jwks.json', (_req: Request, res: Response): void => {
  try {
    // In production, these should come from a key management service
    // For now, returning mock keys for demonstration
    const jwks = {
      keys: [
        {
          // Active key
          kid: 'active-key',
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          n: 'mock-n-value', // In production, this should be the actual public key modulus
          e: 'AQAB', // Public exponent
          status: 'active',
          expiry: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days from now
        },
        {
          // Next key for rotation
          kid: 'next-key',
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          n: 'mock-next-n-value',
          e: 'AQAB',
          status: 'next',
          expiry: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 14), // 14 days from now
        },
      ],
    };

    logger.info('JWKS endpoint accessed', {
      keys_count: jwks.keys.length,
    });

    res.status(200).json(jwks);
  } catch (error) {
    logger.error('Error generating JWKS', { error });
    res.status(500).json({
      error: 'Failed to generate JWKS',
    });
  }
});

export { router as jwksRoutes };

