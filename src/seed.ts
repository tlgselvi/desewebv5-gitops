import { db } from "@/db/index.js";
import { organizations, users, permissions } from "@/db/schema/index.js";
import { logger } from "@/utils/logger.js";

async function seed() {
  logger.info("🌱 Seeding database...");

  const MOCK_ORG_ID = "11111111-1111-1111-1111-111111111111";
  const MOCK_USER_ID = "22222222-2222-2222-2222-222222222222";

  try {
    // 1. Upsert Organization
    await db.insert(organizations).values({
      id: MOCK_ORG_ID,
      name: "Demo Corp",
      slug: "demo-corp",
      subscriptionTier: "enterprise",
      taxId: "1234567890",
      email: "info@democorp.com",
    }).onConflictDoUpdate({
        target: organizations.id,
        set: { name: "Demo Corp" }
    });
    logger.info("✅ Mock Organization created");

    // 2. Upsert User
    await db.insert(users).values({
      id: MOCK_USER_ID,
      email: "admin@example.com",
      password: "mock-password", // Not hashed for mock
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      organizationId: MOCK_ORG_ID,
      isActive: true,
    }).onConflictDoUpdate({
        target: users.id,
        set: { email: "admin@example.com" }
    });
    logger.info("✅ Mock User created");

    // 3. Upsert Permissions
    // Note: permissions table doesn't have unique constraint on (org, role) in schema definition?
    // Let's check. If not, we might duplicate.
    // For now just insert.
    await db.insert(permissions).values({
        organizationId: MOCK_ORG_ID,
        role: "admin",
        resource: "*",
        action: "*",
    });
    logger.info("✅ Admin Permissions granted");

  } catch (error) {
    logger.error("❌ Seeding failed", { error });
    process.exit(1);
  } finally {
    logger.info("🌱 Seeding complete");
    process.exit(0);
  }
}

seed();

