import { db } from '@/db/index.js';
import { users, organizations } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dese.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function createAdminUser() {
  logger.info('🔐 Creating admin user...');

  try {
    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    
    if (existingUsers.length > 0) {
      logger.warn(`⚠️  User with email ${ADMIN_EMAIL} already exists!`);
      logger.info('   To create a new admin user, use different ADMIN_EMAIL or delete existing user.');
      process.exit(0);
    }

    // Get or create default organization
    let orgId: string;
    const existingOrgs = await db.select().from(organizations).limit(1);
    
    if (existingOrgs.length > 0) {
      orgId = existingOrgs[0].id;
      logger.info(`✅ Using existing organization: ${orgId}`);
    } else {
      // Create default organization
      const [newOrg] = await db.insert(organizations).values({
        id: uuidv4(),
        name: 'Default Organization',
        slug: 'default-org',
        subscriptionTier: 'enterprise'
      }).returning();
      
      if (!newOrg) {
        throw new Error('Failed to create organization');
      }
      
      orgId = newOrg.id;
      logger.info(`✅ Created default organization: ${orgId}`);
    }

    // Hash password
    logger.info('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    // Create admin user
    const [newUser] = await db.insert(users).values({
      id: uuidv4(),
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      role: 'admin',
      isActive: true,
      organizationId: orgId
    }).returning();

    if (!newUser) {
      throw new Error('Failed to create admin user');
    }

    logger.info('✅ Admin user created successfully!');
    logger.info('');
    logger.info('📧 Login Credentials:');
    logger.info(`   Email: ${ADMIN_EMAIL}`);
    logger.info(`   Password: ${ADMIN_PASSWORD}`);
    logger.info('');
    logger.info('⚠️  Note: This is a mock login system. In development mode, you can login with any email.');
    logger.info('   For production, use Google OAuth or implement proper password authentication.');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

