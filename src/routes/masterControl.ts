import { Router } from "express";
import { z } from "zod";
import { masterControl } from "@/services/masterControl.js";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate, authorize } from "@/middleware/auth.js";
import { logger } from "@/utils/logger.js";

const router = Router();

// Master Control routes require admin authentication
router.use(authenticate);
router.use(authorize(["admin"]));

// Validation schemas
const CommandSchema = z.object({
  command: z.enum([
    "deploy",
    "sync",
    "update",
    "build",
    "docura",
    "seo-check",
    "aiops-tune",
    "observe",
    "secure",
    "phase-update",
    "rule-verify",
    "self-update",
    "docura-sync",
  ]),
  params: z.record(z.any()).optional(),
});

/**
 * @swagger
 * /master-control/status:
 *   get:
 *     summary: Get Master Control status (CEO MODE Report)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CEO MODE Report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cevap:
 *                   type: string
 *                 kanit:
 *                   type: object
 *                 sonrakiAdim:
 *                   type: object
 */
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    logger.info("Master Control status requested");

    const report = await masterControl.generateCEOReport();

    res.status(200).json(report);
  }),
);

/**
 * @swagger
 * /master-control/verify:
 *   get:
 *     summary: Verify environment (Step 1)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Environment status
 */
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Environment verification requested");

    const status = await masterControl.verifyEnvironment();

    res.status(200).json({
      success: true,
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/compliance:
 *   get:
 *     summary: Check rules compliance (Step 2)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rules compliance status
 */
router.get(
  "/compliance",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Rules compliance check requested");

    const compliance = await masterControl.checkRulesCompliance();

    res.status(200).json({
      success: true,
      compliance,
    });
  }),
);

/**
 * @swagger
 * /master-control/sync:
 *   post:
 *     summary: Sync AIOps + SEO Observer + Docura (Step 3)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status
 */
router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: AIOps + SEO + Docura sync requested");

    const syncStatus = await masterControl.syncAIOpsSEO();

    res.status(200).json({
      success: true,
      sync: syncStatus,
    });
  }),
);

/**
 * @swagger
 * /master-control/github-docker:
 *   get:
 *     summary: Check GitHub + Docker sync status (Step 2.5)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitHub + Docker status
 */
router.get(
  "/github-docker",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: GitHub + Docker status requested");

    const status = await masterControl.syncGitHubDocker();

    res.status(200).json({
      success: true,
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/observe:
 *   post:
 *     summary: Step 2 - Observe (Prometheus + Grafana metrics collection)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics collection status
 */
router.post(
  "/observe",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Step 2 - Observe requested");

    const status = await masterControl.collectMetrics();

    res.status(200).json({
      success: true,
      step: "Step 2: Observe",
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/aiops-tune:
 *   post:
 *     summary: Step 3 - AIOps-Tune (Predictive maintenance model training)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Model training status
 */
router.post(
  "/aiops-tune",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Step 3 - AIOps-Tune requested");

    const status = await masterControl.trainPredictiveModels();

    res.status(200).json({
      success: true,
      step: "Step 3: AIOps-Tune",
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/docura-sync:
 *   post:
 *     summary: Step 4 - Docura-Sync (Documentation + SEO Observer synchronization)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Docura + SEO sync status
 */
router.post(
  "/docura-sync",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Step 4 - Docura-Sync requested");

    const status = await masterControl.syncDocura();

    res.status(200).json({
      success: true,
      step: "Step 4: Docura-Sync",
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/phase-update:
 *   post:
 *     summary: Step 5 - Phase-Update (Phase 7 manifests loading)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Phase update status
 */
router.post(
  "/phase-update",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Step 5 - Phase-Update requested");

    const status = await masterControl.updatePhase7();

    res.status(200).json({
      success: true,
      step: "Step 5: Phase-Update",
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/deploy:
 *   get:
 *     summary: Get deployment status (Step 4)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deployment status
 */
router.get(
  "/deploy",
  asyncHandler(async (req, res) => {
    logger.info("Master Control: Deployment status requested");

    const deploymentStatus = await masterControl.manageDeploymentCycle();

    res.status(200).json({
      success: true,
      deployment: deploymentStatus,
    });
  }),
);

/**
 * @swagger
 * /master-control/execute:
 *   post:
 *     summary: Execute Master Control workflow or command
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - workflow
 *                 properties:
 *                   workflow:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         step:
 *                           type: string
 *                           enum: [rule-verify, observe, aiops-tune, docura-sync, phase-update, github-tag-build, argocd-sync, observability-verify]
 *                         action:
 *                           type: string
 *                         source:
 *                           type: string
 *                         policy:
 *                           type: string
 *                         targets:
 *                           type: array
 *                           items:
 *                             type: string
 *                         metrics:
 *                           type: array
 *                           items:
 *                             type: string
 *                         model:
 *                           type: string
 *                         dataset:
 *                           type: string
 *                         parameters:
 *                           type: object
 *                         docura_image:
 *                           type: string
 *                         seo_observer:
 *                           type: boolean
 *                         target_phase:
 *                           type: string
 *                         apply_manifests:
 *                           type: boolean
 *                         commit_changes:
 *                           type: boolean
 *                         version:
 *                           type: string
 *                           description: Version tag for GitHub and Docker (e.g., v6.8.0-rc)
 *                         image_name:
 *                           type: string
 *                           description: Docker image name
 *                         registry:
 *                           type: string
 *                           description: Docker registry URL
 *                         argocd_app:
 *                           type: string
 *                           description: ArgoCD application name
 *                         sync_timeout:
 *                           type: number
 *                           description: ArgoCD sync timeout in seconds
 *                   auto_commit:
 *                     type: boolean
 *                   self_update:
 *                     type: boolean
 *                   validation:
 *                     type: boolean
 *                   observability_check:
 *                     type: boolean
 *                   full_cycle:
 *                     type: boolean
 *               - type: object
 *                 required:
 *                   - command
 *                 properties:
 *                   command:
 *                     type: string
 *                     enum: [deploy, sync, update, build, docura, seo-check, aiops-tune, observe, secure, phase-update, rule-verify, docura-sync, self-update]
 *                   params:
 *                     type: object
 *     responses:
 *       200:
 *         description: Workflow execution result or CEO MODE Report
 */
router.post(
  "/execute",
  asyncHandler(async (req, res) => {
    // Check if it's a workflow execution request
    if (req.body.workflow && Array.isArray(req.body.workflow)) {
      logger.info("Master Control: Workflow execution requested", {
        stepsCount: req.body.workflow.length,
      });

      // Validate workflow structure
      const WorkflowSchema = z.object({
        workflow: z.array(
          z.object({
            step: z.enum([
              "rule-verify",
              "observe",
              "aiops-tune",
              "docura-sync",
              "phase-update",
              "github-tag-build",
              "argocd-sync",
              "observability-verify",
            ]),
            action: z.string().optional(),
            source: z.string().optional(),
            policy: z.string().optional(),
            targets: z.array(z.string()).optional(),
            metrics: z.array(z.string()).optional(),
            model: z.string().optional(),
            dataset: z.string().optional(),
            parameters: z.record(z.any()).optional(),
            docura_image: z.string().optional(),
            seo_observer: z.boolean().optional(),
            target_phase: z.string().optional(),
            apply_manifests: z.boolean().optional(),
            commit_changes: z.boolean().optional(),
            version: z.string().optional(),
            image_name: z.string().optional(),
            registry: z.string().optional(),
            argocd_app: z.string().optional(),
            sync_timeout: z.number().optional(),
          }),
        ),
        auto_commit: z.boolean().optional(),
        self_update: z.boolean().optional(),
        validation: z.boolean().optional(),
        observability_check: z.boolean().optional(),
        full_cycle: z.boolean().optional(),
      });

      const validated = WorkflowSchema.parse(req.body);
      // Ensure workflow array is present (required by WorkflowExecutionRequest)
      if (!validated.workflow || validated.workflow.length === 0) {
        return res.status(400).json({
          error: "Validation error",
          message: "workflow array is required and must not be empty",
        });
      }
      const workflowResult = await masterControl.executeWorkflow({
        ...validated,
        workflow: validated.workflow || [],
      } as import("@/services/masterControl.js").WorkflowExecutionRequest);

      res.status(200).json(workflowResult);
    } else {
      // Legacy command execution
      const validated = CommandSchema.parse(req.body);
      const { command, params } = validated;

      logger.info("Master Control: Command execution requested", {
        command,
        params,
      });

      const report = await masterControl.executeCommand(command, params);

      res.status(200).json(report);
    }
  }),
);

/**
 * @swagger
 * /master-control/self-update:
 *   post:
 *     summary: Perform self-update cycle (Step 6)
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [context, prompt, pipeline, rules, config]
 *                     description:
 *                       type: string
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Self-update status
 */
router.post(
  "/self-update",
  asyncHandler(async (req, res) => {
    const { updates } = req.body;

    logger.info("Master Control: Self-update requested", {
      updatesCount: updates?.length || 0,
    });

    const status = await masterControl.performSelfUpdate(updates);

    res.status(200).json({
      success: true,
      status,
    });
  }),
);

/**
 * @swagger
 * /master-control/report:
 *   get:
 *     summary: Generate CEO MODE Report
 *     tags: [Master Control]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: command
 *         schema:
 *           type: string
 *         description: Optional command context
 *     responses:
 *       200:
 *         description: CEO MODE Report
 */
router.get(
  "/report",
  asyncHandler(async (req, res) => {
    const { command } = req.query;

    logger.info("Master Control: CEO report generation requested", { command });

    const report = await masterControl.generateCEOReport(command as string);

    res.status(200).json(report);
  }),
);

export { router as masterControlRoutes };
