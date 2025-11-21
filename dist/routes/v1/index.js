import { Router } from "express";
import { aiopsRouter } from "@/routes/v1/aiops.js";
import { authRouter } from "@/routes/v1/auth.js";
import { adminRouter } from "@/routes/v1/admin.js";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
const v1Router = Router();
v1Router.use("/auth", authRouter);
v1Router.use("/aiops", aiopsRouter);
// Admin routes - protected with authentication and admin role
v1Router.use("/admin", authenticate, requireRole(["admin"]), adminRouter);
export { v1Router };
//# sourceMappingURL=index.js.map