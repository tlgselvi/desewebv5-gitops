import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from '@/config/index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dese EA Plan v5.0 API',
      version: '5.0.0',
      description: 'CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama API',
      contact: {
        name: 'CPT Digital Team',
        email: 'dev@dese.ai',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.dese.ai',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
          required: ['error', 'message', 'timestamp'],
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
            version: {
              type: 'string',
              description: 'Application version',
            },
            environment: {
              type: 'string',
              description: 'Environment name',
            },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected'],
            },
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'number',
                  description: 'Used memory in MB',
                },
                total: {
                  type: 'number',
                  description: 'Total memory in MB',
                },
              },
            },
          },
          required: ['status', 'timestamp', 'uptime', 'version', 'environment', 'database'],
        },
        SeoProject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              description: 'Project name',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
            domain: {
              type: 'string',
              description: 'Target domain',
            },
            targetRegion: {
              type: 'string',
              description: 'Target region',
              default: 'Türkiye',
            },
            primaryKeywords: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Primary keywords for SEO',
            },
            targetDomainAuthority: {
              type: 'integer',
              description: 'Target domain authority',
              default: 50,
            },
            targetCtrIncrease: {
              type: 'integer',
              description: 'Target CTR increase percentage',
              default: 25,
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'archived'],
              default: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['name', 'domain', 'primaryKeywords'],
        },
        SeoMetrics: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            projectId: {
              type: 'string',
              format: 'uuid',
            },
            url: {
              type: 'string',
              description: 'Tested URL',
            },
            performance: {
              type: 'number',
              description: 'Performance score (0-100)',
            },
            accessibility: {
              type: 'number',
              description: 'Accessibility score (0-100)',
            },
            bestPractices: {
              type: 'number',
              description: 'Best practices score (0-100)',
            },
            seo: {
              type: 'number',
              description: 'SEO score (0-100)',
            },
            firstContentfulPaint: {
              type: 'number',
              description: 'First Contentful Paint in ms',
            },
            largestContentfulPaint: {
              type: 'number',
              description: 'Largest Contentful Paint in ms',
            },
            cumulativeLayoutShift: {
              type: 'number',
              description: 'Cumulative Layout Shift score',
            },
            firstInputDelay: {
              type: 'number',
              description: 'First Input Delay in ms',
            },
            totalBlockingTime: {
              type: 'number',
              description: 'Total Blocking Time in ms',
            },
            speedIndex: {
              type: 'number',
              description: 'Speed Index in ms',
            },
            timeToInteractive: {
              type: 'number',
              description: 'Time to Interactive in ms',
            },
            measuredAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['projectId', 'url', 'measuredAt'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        apiKey: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
  ],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Dese EA Plan v5.0 API Documentation',
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  logger.info('API Documentation available', {
    url: `http://localhost:${config.port}/api-docs`,
  });
}
