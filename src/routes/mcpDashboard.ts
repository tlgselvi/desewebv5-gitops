import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "@/middleware/auth.js";
import { asyncHandler, createError } from "@/middleware/errorHandler.js";
import { mcpDashboardService } from "@/services/mcp/mcpDashboardService.js";
import { logger } from "@/utils/logger.js";

const router = Router();

const paramsSchema = z.object({
  moduleName: z.enum(["mubot", "finbot", "aiops", "observability"], {
    required_error: "moduleName parametresi zorunludur",
  }),
});

router.get(
  "/:moduleName",
  authenticate,
  authorize(["admin", "mcp.dashboard.read"]),
  asyncHandler(async (req, res) => {
    const parseResult = paramsSchema.safeParse(req.params);

    if (!parseResult.success) {
      logger.warn("Invalid MCP dashboard params", {
        params: req.params,
        issues: parseResult.error.issues,
      });
      throw createError("Geçersiz modül parametresi", 400);
    }

    const { moduleName } = parseResult.data;

    const data = await mcpDashboardService.getDashboardData(moduleName);

    res.json(data);
  }),
);

export { router as mcpDashboardRoutes };


