import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
import { db, users, organizations, permissions } from "@/db/index.js";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { v4 as uuidv4 } from 'uuid';

/**
 * Passport Google OAuth Strategy
 * Handles Google OAuth authentication and user creation/retrieval
 */

// Define user type for Passport
interface PassportUser {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: string | null;
}

// Extend Express.User type for Passport
declare global {
  namespace Express {
    interface User extends PassportUser {}
  }
}

// Serialize user to session (store only user ID)
passport.serializeUser((user: PassportUser, done) => {
  done(null, user.id);
});

// Deserialize user from session (retrieve full user object)
passport.deserializeUser(async (id: unknown, done) => {
  try {
    if (typeof id !== "string") {
      return done(new Error("Invalid user ID"), null);
    }

    const userList = await db.select().from(users).where(sql`${users.id} = ${id}`).limit(1);
    
    if (userList.length === 0 || !userList[0]) {
      return done(new Error("User not found"), null);
    }

    const user = userList[0];
    const passportUser: PassportUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
    };
    done(null, passportUser);
  } catch (error) {
    logger.error("Error deserializing user", {
      error: error instanceof Error ? error.message : String(error),
      userId: id,
    });
    done(error instanceof Error ? error : new Error(String(error)), null);
  }
});

// Google OAuth Strategy (only if credentials are configured)
if (config.apis.google.oauth?.clientId && config.apis.google.oauth?.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.apis.google.oauth.clientId,
        clientSecret: config.apis.google.oauth.clientSecret,
        callbackURL: config.apis.google.oauth.callbackUrl || "",
        scope: ["profile", "email"],
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const { id: googleId, displayName, emails } = profile;
        const email = emails?.[0]?.value;

        if (!email) {
          logger.warn("Google profile missing email", { googleId, displayName });
          return done(new Error("Google profile missing email"), undefined);
        }

        // Check if user exists in database
        // Use sql template to avoid Drizzle ORM SQL generation bug
        const existingUsers = await db
          .select()
          .from(users)
          .where(sql`${users.email} = ${email}`)
          .limit(1);

        let userId: string;
        let userRole: string;
        let userOrgId: string | null = null;
        let firstName: string | null = null;
        let lastName: string | null = null;

        if (existingUsers.length === 0) {
          // Create new user with Organization
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const nameParts = displayName?.split(" ") || [];
          firstName = nameParts[0] || null;
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

          // Start transaction
          const newUser = await db.transaction(async (tx) => {
             // 1. Create Organization
             const [newOrg] = await tx.insert(organizations).values({
                 id: uuidv4(),
                 name: `${displayName || email}'s Org`,
                 slug: (displayName || email || 'org').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + (crypto.randomBytes(4).toString('hex') || 'default'),
                 subscriptionTier: 'starter'
             }).returning();

             if (!newOrg) {
                 throw new Error('Failed to create organization');
             }

             // 2. Create User linked to Org
             const [createdUser] = await tx.insert(users).values({
                email,
                password: randomPassword, // OAuth users have random password
                firstName,
                lastName,
                role: "admin", // Default role for new org owner
                isActive: true,
                organizationId: newOrg.id
             }).returning();
             
             // 3. Create Admin Permissions
             await tx.insert(permissions).values({
                 organizationId: newOrg.id,
                 role: 'admin',
                 resource: '*',
                 action: '*'
             });

             return createdUser;
          });

          if (!newUser) {
            throw new Error("Failed to create user");
          }

          userId = newUser.id;
          userRole = newUser.role;
          userOrgId = newUser.organizationId;
          logger.info("Created new user & org from Google OAuth", { email, userId, googleId, orgId: userOrgId });
        } else {
          // User exists, update last login
          const existingUser = existingUsers[0];
          if (!existingUser) {
            throw new Error("User not found in database");
          }
          userId = existingUser.id;
          userRole = existingUser.role;
          userOrgId = existingUser.organizationId;
          firstName = existingUser.firstName;
          lastName = existingUser.lastName;

          await db
            .update(users)
            .set({
              lastLogin: new Date(),
            })
            .where(eq(users.id, userId));

          logger.info("User logged in via Google OAuth", { email, userId, googleId });
        }

        // Return user object for Passport
        const user: Express.User = {
          id: userId,
          email,
          role: userRole,
          firstName,
          lastName,
          organizationId: userOrgId,
        };

        return done(null, user);
      } catch (error) {
        logger.error("Error in Google OAuth strategy", {
          error: error instanceof Error ? error.message : String(error),
          email: profile.emails?.[0]?.value,
        });
        return done(error, undefined);
      }
    },
    ),
  );
  logger.info("Google OAuth strategy configured");
} else {
  logger.warn("Google OAuth credentials not configured. Google OAuth login will be disabled.");
}

// Passport is already configured, no need to export
// Import this file to initialize Passport strategies

