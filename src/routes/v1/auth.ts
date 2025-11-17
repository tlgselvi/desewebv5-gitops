import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";

const authRouter: Router = Router();

authRouter.post("/login", (req: Request, res: Response): void => {
  const { username = "test@example.com" } = req.body ?? {};

  try {
    const token = jwt.sign(
      {
        id: "mock-user",
        email: username,
        role: "tester",
        permissions: ["dashboard:read"],
      },
      config.security.jwtSecret,
      { expiresIn: "1h" },
    );

    logger.debug("Mock login token issued", { username });

    res.json({
      success: true,
      token,
      user: {
        id: "mock-user",
        email: username,
        role: "tester",
      },
    });
  } catch (error) {
    logger.error("Failed to generate mock login token", { error });
    res.status(500).json({
      success: false,
      error: "mock_login_failed",
      message: "Unable to generate mock login token",
    });
  }
});

export { authRouter };

