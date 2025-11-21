#!/usr/bin/env node

/**
 * Admin Promotion Script
 * 
 * Promotes a user to admin role via CLI
 * 
 * Usage:
 *   npx tsx scripts/make-admin.ts user@email.com
 * 
 * Or with pnpm:
 *   pnpm tsx scripts/make-admin.ts user@email.com
 */

import { db, users } from "../src/db/index.js";
import { eq } from "drizzle-orm";
import { closeDatabaseConnection } from "../src/db/index.js";
import { logger } from "../src/utils/logger.js";

async function makeAdmin(email: string): Promise<void> {
  try {
    console.log(`Looking up user with email: ${email}...`);

    // Find user by email
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = existingUsers[0];

    if (user.role === "admin") {
      console.log(`ℹ️  User ${email} is already an admin.`);
      process.exit(0);
    }

    console.log(`Current role: ${user.role}`);
    console.log(`Updating role to admin...`);

    // Update user role to admin
    const [updatedUser] = await db
      .update(users)
      .set({
        role: "admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user role");
    }

    logger.info("User promoted to admin via CLI script", {
      email,
      userId: user.id,
      previousRole: user.role,
    });

    console.log(`✅ Successfully promoted ${email} to admin role.`);
    console.log(`   User ID: ${updatedUser.id}`);
    console.log(`   Name: ${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || "N/A");
    console.log(`   Role: ${updatedUser.role}`);
  } catch (error) {
    console.error("❌ Error promoting user to admin:", error);
    logger.error("Failed to promote user to admin via CLI script", {
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

if (!email) {
  console.error("❌ Error: Email address is required");
  console.log("\nUsage:");
  console.log("  npx tsx scripts/make-admin.ts user@email.com");
  console.log("  or");
  console.log("  pnpm tsx scripts/make-admin.ts user@email.com");
  process.exit(1);
}

// Validate email format (basic check)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Error: Invalid email format: ${email}`);
  process.exit(1);
}

// Run the script
makeAdmin(email)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });

