import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, users } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { logger } from "@/utils/logger.js";
import type { RequestWithUser } from "@/middleware/auth.js";
import { setRLSContextMiddleware } from "@/middleware/rls.js";

const adminRouter: Router = Router();

// Apply RLS middleware to all admin routes for tenant isolation
// Note: Admin routes may need to access cross-tenant data, but RLS context
// should still be set for audit logging and security tracking
adminRouter.use(setRLSContextMiddleware);

/**
 * User response type
 */
interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /admin/users
 * List all users (admin only)
 */
adminRouter.get(
  "/users",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    logger.info("Admin fetched user list", {
      count: allUsers.length,
      adminId: (req as RequestWithUser).user?.id,
    });

    res.json({
      success: true,
      data: allUsers,
      count: allUsers.length,
    });
  }),
);

/**
 * Update user role request schema
 */
const updateRoleSchema = z.object({
  role: z.enum(["admin", "user"]),
});

/**
 * PATCH /admin/users/:id/role
 * Update user role (admin only)
 */
adminRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    // Validate id parameter
    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "invalid_id",
        message: "Invalid user ID",
      });
      return;
    }

    const adminId = (req as RequestWithUser).user?.id;

    // Validate request body
    const validationResult = updateRoleSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Invalid request body",
        details: validationResult.error.issues,
      });
      return;
    }

    const { role } = validationResult.data;

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUsers.length === 0 || !existingUsers[0]) {
      res.status(404).json({
        success: false,
        error: "user_not_found",
        message: "User not found",
      });
      return;
    }

    const user = existingUsers[0];

    // Prevent self-demotion (admin cannot remove their own admin role)
    if (id === adminId && role !== "admin") {
      res.status(400).json({
        success: false,
        error: "self_demotion_forbidden",
        message: "You cannot remove your own admin role",
      });
      return;
    }

    // Update user role
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user role");
    }

    logger.info("Admin updated user role", {
      userId: id,
      newRole: role,
      adminId,
      userEmail: user.email,
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isActive: updatedUser.isActive,
      },
      message: `User role updated to ${role}`,
    });
  }),
);

export { adminRouter };

