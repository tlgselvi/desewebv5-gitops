#!/usr/bin/env tsx
/**
 * Script to create a test user for development
 * Usage: tsx scripts/create-test-user.ts
 */

import { db, users } from '../src/db/index.js';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';
import { eq } from 'drizzle-orm';

async function createTestUser() {
  const email = process.env.TEST_USER_EMAIL || 'admin@test.com';
  const password = process.env.TEST_USER_PASSWORD || 'admin123';
  const firstName = process.env.TEST_USER_FIRST_NAME || 'Test';
  const lastName = process.env.TEST_USER_LAST_NAME || 'Admin';
  const role = (process.env.TEST_USER_ROLE || 'admin') as 'user' | 'admin';

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`⚠️  User with email ${email} already exists.`);
      console.log(`   You can login with:`);
      console.log(`   Username: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`   Username: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${role}`);
    console.log('');
    console.log('You can now login at: http://localhost:3000/login');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

