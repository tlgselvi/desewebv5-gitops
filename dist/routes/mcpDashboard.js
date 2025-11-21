import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "@/middleware/auth.js";
import { asyncHandler, createError } from "@/middleware/errorHandler.js";
import { mcpDashboardService, } from "@/services/mcp/mcpDashboardService.js";
import { logger } from "@/utils/logger.js";
const router = Router();
const MODULE_NAMES = ["mubot", "finbot", "aiops", "observability"];
const paramsSchema = z.object({
    moduleName: z.enum(MODULE_NAMES),
});
router.get("/:moduleName", authenticate, authorize(["admin", "mcp.dashboard.read"]), asyncHandler(async (req, res) => {
    const parseResult = paramsSchema.safeParse(req.params);
    if (!parseResult.success) {
        const issues = parseResult.error.issues;
        const message = issues.some((issue) => issue.code === z.ZodIssueCode.invalid_type &&
            issue.path[0] === "moduleName")
            ? "moduleName parametresi zorunludur"
            : "Geçersiz modül parametresi";
        logger.warn("Invalid MCP dashboard params", {
            params: req.params,
            issues,
        });
        throw createError(message, 400);
    }
    const moduleName = parseResult.data.moduleName;
    const data = await mcpDashboardService.getDashboardData(moduleName);
    res.json(data);
}));
export { router as mcpDashboardRoutes };
//# sourceMappingURL=mcpDashboard.js.map