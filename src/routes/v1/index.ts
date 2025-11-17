import { Router, type Router as ExpressRouter } from "express";
import { aiopsRouter } from "@/routes/v1/aiops.js";
import { authRouter } from "@/routes/v1/auth.js";

const v1Router: ExpressRouter = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/aiops", aiopsRouter);

export { v1Router };
