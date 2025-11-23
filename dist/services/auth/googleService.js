import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { db, users } from "../../db/index.js";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "crypto";
/**
 * Google OAuth Service
 * Handles Google OAuth 2.0 authentication flow
 */
export const googleService = {
    /**
     * Get Google OAuth authorization URL
     * Returns the Google login URL with proper scopes (email, profile)
     */
    getGoogleAuthURL() {
        const { clientId, callbackUrl } = config.apis.google.oauth || {};
        if (!clientId || !callbackUrl) {
            logger.error("Google OAuth not configured: missing clientId or callbackUrl");
            throw new Error("Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CALLBACK_URL environment variables.");
        }
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: callbackUrl,
            response_type: "code",
            scope: "email profile",
            access_type: "offline",
            prompt: "consent",
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        logger.debug("Generated Google OAuth authorization URL", { callbackUrl });
        return authUrl;
    },
    /**
     * Verify Google token and fetch user profile
     * Exchanges the authorization code for tokens and fetches user profile
     */
    async verifyGoogleToken(code) {
        const { clientId, clientSecret, callbackUrl } = config.apis.google.oauth || {};
        if (!clientId || !clientSecret || !callbackUrl) {
            throw new Error("Google OAuth is not fully configured.");
        }
        // Exchange code for access token
        const tokenUrl = "https://oauth2.googleapis.com/token";
        const tokenParams = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callbackUrl,
            grant_type: "authorization_code",
        });
        try {
            logger.debug("Exchanging Google OAuth code for token");
            const tokenResponse = await fetch(tokenUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: tokenParams.toString(),
            });
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}));
                logger.error("Failed to exchange Google OAuth code for token", {
                    status: tokenResponse.status,
                    error: errorData,
                });
                throw new Error(`Failed to exchange authorization code: ${tokenResponse.statusText}`);
            }
            const tokenData = await tokenResponse.json();
            logger.debug("Successfully exchanged Google OAuth code for token");
            // Get user info from Google
            const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            });
            if (!userInfoResponse.ok) {
                logger.error("Failed to fetch Google user info", { status: userInfoResponse.status });
                throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
            }
            const userInfo = await userInfoResponse.json();
            logger.debug("Successfully fetched Google user info", { email: userInfo.email });
            if (!userInfo.email || !userInfo.verified_email) {
                throw new Error("Google account email not verified");
            }
            return {
                email: userInfo.email,
                name: userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() || userInfo.email,
                given_name: userInfo.given_name,
                family_name: userInfo.family_name,
                picture: userInfo.picture,
                verified_email: userInfo.verified_email,
            };
        }
        catch (error) {
            logger.error("Error verifying Google token", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    },
    /**
     * Handle social login
     * Check if user exists in DB, create if not, return user and JWT token
     */
    async handleSocialLogin(email, name) {
        try {
            // Check if user exists
            // Use sql template to avoid Drizzle ORM SQL generation bug
            const existingUsers = await db.select().from(users).where(sql `${users.email} = ${email}`).limit(1);
            let userId;
            let userRole;
            let firstName = null;
            let lastName = null;
            if (existingUsers.length === 0) {
                // Create new user
                // Generate a random password for OAuth users (they won't use it)
                const randomPassword = crypto.randomBytes(32).toString("hex");
                const nameParts = name.split(" ");
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
                logger.info("Created new user from Google OAuth", { email, userId });
            }
            else {
                // User exists, return existing user
                const existingUser = existingUsers[0];
                if (!existingUser) {
                    throw new Error("User not found in database");
                }
                userId = existingUser.id;
                userRole = existingUser.role;
                firstName = existingUser.firstName;
                lastName = existingUser.lastName;
                // Update last login
                await db
                    .update(users)
                    .set({
                    lastLogin: new Date(),
                })
                    .where(eq(users.id, userId));
                logger.info("User logged in via Google OAuth", { email, userId });
            }
            // Generate JWT token
            const jwtPayload = {
                id: userId,
                email,
                role: userRole,
                permissions: userRole === "admin" ? ["admin", "mcp.dashboard.read"] : [],
            };
            const expiresInValue = config.security.jwtExpiresIn ?? "24h";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const token = jwt.sign(jwtPayload, config.security.jwtSecret, {
                expiresIn: expiresInValue,
            });
            return {
                user: {
                    id: userId,
                    email,
                    role: userRole,
                    firstName,
                    lastName,
                },
                token,
            };
        }
        catch (error) {
            logger.error("Error handling social login", {
                error: error instanceof Error ? error.message : String(error),
                email,
            });
            throw error;
        }
    },
};
//# sourceMappingURL=googleService.js.map