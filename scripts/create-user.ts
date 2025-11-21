#!/usr/bin/env node

/**
 * Create User Script
 * 
 * Creates a new user in the database
 * 
 * Usage:
 *   npx tsx scripts/create-user.ts email@example.com "First Name" "Last Name" password
 * 
 * Or with pnpm:
 *   pnpm tsx scripts/create-user.ts email@example.com "First Name" "Last Name" password
 */

import { db, users } from "../src/db/index.js";
import { eq } from "drizzle-orm";
import { closeDatabaseConnection } from "../src/db/index.js";
import { logger } from "../src/utils/logger.js";
import crypto from "crypto";

async function createUser(
  email: string,
  firstName: string | null,
  lastName: string | null,
  password: string,
): Promise<void> {
  try {
    console.log(`Creating user with email: ${email}...`);

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      console.log(`ℹ️  User ${email} already exists.`);
      process.exit(0);
    }

    // Hash password using crypto (simple hash for development)
    // Note: In production, use bcrypt for better security
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "user",
        isActive: true,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    logger.info("User created via CLI script", {
      email,
      userId: newUser.id,
      role: newUser.role,
    });

    console.log(`✅ Successfully created user: ${email}`);
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Name: ${newUser.firstName || ""} ${newUser.lastName || ""}`.trim() || "N/A");
    console.log(`   Role: ${newUser.role}`);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    logger.error("Failed to create user via CLI script", {
      error: error instanceof Error ? error.message : String(error),
      email,
    });
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabaseConnection();
  }
}

// Main execution
const email = process.argv[2];
const firstName = process.argv[3] || null;
const lastName = process.argv[4] || null;
const password = process.argv[5];

if (!email) {
  console.error("❌ Error: Email address is required");
  console.log("\nUsage:");
  console.log("  npx tsx scripts/create-user.ts email@example.com [firstName] [lastName] password");
  console.log("  or");
  console.log("  pnpm tsx scripts/create-user.ts email@example.com [firstName] [lastName] password");
  process.exit(1);
}

if (!password) {
  console.error("❌ Error: Password is required");
  console.log("\nUsage:");
  console.log("  npx tsx scripts/create-user.ts email@example.com [firstName] [lastName] password");
  process.exit(1);
}

// Validate email format (basic check)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Error: Invalid email format: ${email}`);
  process.exit(1);
}

// Run the script
createUser(email, firstName, lastName, password)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });

