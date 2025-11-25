import { Router, type Router as ExpressRouter } from "express";
import { aiopsRouter } from "@/routes/v1/aiops.js";
import { authRouter } from "@/routes/v1/auth.js";
import { adminRouter } from "@/routes/v1/admin.js";
import { ceoRouter } from "@/routes/v1/ceo.js";
import { jarvisRouter } from "@/routes/v1/jarvis.js";
import { financeRoutes } from "@/modules/finance/routes.js";
import { crmRoutes } from "@/modules/crm/routes.js";
import { inventoryRoutes } from "@/modules/inventory/routes.js";
import { iotRoutes } from "@/modules/iot/routes.js";
import hrRoutes from "@/modules/hr/routes.js";
import { integrationRoutes } from "@/modules/saas/integration.routes.js";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";

const v1Router: ExpressRouter = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/aiops", aiopsRouter);

// CEO Dashboard - Aggregated view
v1Router.use("/ceo", authenticate, ceoRouter);

// AI & Automation
v1Router.use("/jarvis", jarvisRouter);

// Enterprise Modules
v1Router.use("/finance", financeRoutes);
v1Router.use("/crm", crmRoutes);
v1Router.use("/inventory", inventoryRoutes);
v1Router.use("/iot", iotRoutes);
v1Router.use("/hr", hrRoutes);

// SaaS & Integrations
v1Router.use("/integrations", integrationRoutes);

// Admin routes - protected with authentication and admin role
v1Router.use("/admin", authenticate, requireRole(["admin"]), adminRouter);

export { v1Router };
