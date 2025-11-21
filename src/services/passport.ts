import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
import { db, users } from "@/db/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Passport Google OAuth Strategy
 * Handles Google OAuth authentication and user creation/retrieval
 */

// Extend Express User type for Passport
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
    }
  }
}

// Serialize user to session (store only user ID)
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Deserialize user from session (retrieve full user object)
passport.deserializeUser(async (id: string, done) => {
  try {
    const userList = await db.select().from(users).where(eq(users.id, id)).limit(1);
    
    if (userList.length === 0) {
      return done(new Error("User not found"), null);
    }

    const user = userList[0];
    done(null, {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    logger.error("Error deserializing user", {
      error: error instanceof Error ? error.message : String(error),
      userId: id,
    });
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.apis.google.oauth?.clientId || "",
      clientSecret: config.apis.google.oauth?.clientSecret || "",
      callbackURL: config.apis.google.oauth?.callbackUrl || "",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const { id: googleId, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value;

        if (!email) {
          logger.warn("Google profile missing email", { googleId, displayName });
          return done(new Error("Google profile missing email"), undefined);
        }

        // Check if user exists in database
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId: string;
        let userRole: string;
        let firstName: string | null = null;
        let lastName: string | null = null;

        if (existingUsers.length === 0) {
          // Create new user
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const nameParts = displayName?.split(" ") || [];
          firstName = nameParts[0] || null;
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

          const [newUser] = await db
            .insert(users)
            .values({
              email,
              password: randomPassword, // OAuth users have random password
              firstName,
              lastName,
              role: "user", // Default role
              isActive: true,
            })
            .returning();

          if (!newUser) {
            throw new Error("Failed to create user");
          }

          userId = newUser.id;
          userRole = newUser.role;
          logger.info("Created new user from Google OAuth", { email, userId, googleId });
        } else {
          // User exists, update last login
          const existingUser = existingUsers[0];
          userId = existingUser.id;
          userRole = existingUser.role;
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
        };

        return done(null, user);
      } catch (error) {
        logger.error("Error in Google OAuth strategy", {
          error: error instanceof Error ? error.message : String(error),
          email: emails?.[0]?.value,
        });
        return done(error, undefined);
      }
    },
  ),
);

// Passport is already configured, no need to export
// Import this file to initialize Passport strategies

