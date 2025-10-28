import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from './utils/logger.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Register plugins
await fastify.register(helmet);
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'EA Plan v6.0 Auth Service',
      description: 'Authentication and Authorization Service',
      version: '1.0.0'
    },
    host: 'localhost:3001',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// Schemas
const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
});

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'operator', 'viewer']).default('viewer')
});

const TokenSchema = z.object({
  token: z.string()
});

// Mock user database (in production, use PostgreSQL)
const users = new Map([
  ['admin', {
    id: '1',
    username: 'admin',
    email: 'admin@ea-plan-v6.local',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  ['operator', {
    id: '2',
    username: 'operator',
    email: 'operator@ea-plan-v6.local',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'operator',
    createdAt: new Date(),
    updatedAt: new Date()
  }]
]);

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'ea-plan-v6-super-secret-key-change-in-production';

// Routes
fastify.post('/api/v1/auth/login', {
  schema: {
    description: 'User login',
    tags: ['auth'],
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { username, password } = LoginSchema.parse(request.body);
    
    const user = users.get(username);
    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return reply.code(401).send({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User ${username} logged in successfully`);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    logger.error('Login error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid request data'
    });
  }
});

fastify.post('/api/v1/auth/register', {
  schema: {
    description: 'User registration',
    tags: ['auth'],
    body: {
      type: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'operator', 'viewer'] }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { username, email, password, role } = RegisterSchema.parse(request.body);
    
    if (users.has(username)) {
      return reply.code(409).send({
        success: false,
        error: 'Username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = (users.size + 1).toString();
    
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.set(username, newUser);

    logger.info(`New user registered: ${username} with role ${role}`);

    return reply.code(201).send({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid request data'
    });
  }
});

fastify.post('/api/v1/auth/verify', {
  schema: {
    description: 'Verify JWT token',
    tags: ['auth'],
    body: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          valid: { type: 'boolean' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { token } = TokenSchema.parse(request.body);
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return {
      success: true,
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    };
  } catch (error) {
    logger.error('Token verification error:', error);
    return reply.code(401).send({
      success: false,
      valid: false,
      error: 'Invalid token'
    });
  }
});

fastify.get('/api/v1/auth/users', {
  schema: {
    description: 'Get all users (admin only)',
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const usersList = Array.from(users.values()).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString()
    }));

    return {
      success: true,
      users: usersList
    };
  } catch (error) {
    logger.error('Get users error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          service: { type: 'string' },
          version: { type: 'string' }
        }
      }
    }
  }
}, async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0'
  };
});

// Metrics endpoint
fastify.get('/metrics', {
  schema: {
    description: 'Prometheus metrics endpoint',
    tags: ['metrics']
  }
}, async () => {
  return `# HELP auth_service_requests_total Total number of requests
# TYPE auth_service_requests_total counter
auth_service_requests_total{method="login"} 0
auth_service_requests_total{method="register"} 0
auth_service_requests_total{method="verify"} 0

# HELP auth_service_users_total Total number of users
# TYPE auth_service_users_total gauge
auth_service_users_total ${users.size}
`;
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 Auth Service running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
