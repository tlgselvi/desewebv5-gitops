#!/usr/bin/env node
/**
 * EA Plan Master Control CLI
 * Command-line interface for Master Control operations
 */
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import { appendFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
const execAsync = promisify(exec);
// Simple logger for CLI (no dependency on config)
const logger = {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta || ""),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ""),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ""),
};
// Get API base URL from environment
const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || "http://localhost:3000";
const API_VERSION = "/api/v1";
/**
 * Master Context Lock File Management
 */
const MASTER_CONTEXT_FILE = ".masterContext.lock";
async function appendToMasterContext(phase, content, options) {
    if (!options.prompt_append && !options.persistent) {
        return; // Append mode not enabled
    }
    const timestamp = new Date().toISOString();
    const separator = "\n" + "=".repeat(80) + "\n";
    const appendContent = `\n[${timestamp}] ${phase}\n${separator}${content}\n${separator}\n`;
    try {
        await appendFile(MASTER_CONTEXT_FILE, appendContent, "utf-8");
        logger.info("Master context updated", { phase, file: MASTER_CONTEXT_FILE });
    }
    catch (error) {
        logger.error("Failed to append to master context", {
            error: error.message,
        });
    }
}
async function initializeMasterContext(options) {
    if (!options.prompt_append && !options.persistent) {
        return;
    }
    const initContent = `# EA Plan Master Control v6.8 - Persistent Context
# Mode: ${options.prompt_append ? "Prompt Append Chain" : "Persistent Orchestrator"}
# Initialized: ${new Date().toISOString()}
# Version: ${options.version || "v6.8.0"}

`;
    try {
        if (!existsSync(MASTER_CONTEXT_FILE)) {
            await writeFile(MASTER_CONTEXT_FILE, initContent, "utf-8");
            logger.info("Master context initialized", { file: MASTER_CONTEXT_FILE });
        }
    }
    catch (error) {
        logger.error("Failed to initialize master context", {
            error: error.message,
        });
    }
}
/**
 * Execute API call
 */
async function callAPI(endpoint, method = "GET", body) {
    try {
        const url = `${API_BASE_URL}${API_VERSION}${endpoint}`;
        logger.info("CLI: API call", { url, method });
        const response = await axios({
            method,
            url,
            data: body,
            timeout: 300000, // 5 minutes
            headers: {
                "Content-Type": "application/json",
                // Add auth token if available
                ...(process.env.MASTER_CONTROL_TOKEN
                    ? { Authorization: `Bearer ${process.env.MASTER_CONTROL_TOKEN}` }
                    : {}),
                // Development CLI bypass header
                "X-Master-Control-CLI": "true",
            },
        });
        return response.data;
    }
    catch (error) {
        if (error.response) {
            logger.error("API error", {
                status: error.response.status,
                data: error.response.data,
            });
            throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        else if (error.request) {
            logger.error("API connection error", { error: error.message });
            throw new Error(`API Connection Error: ${error.message}`);
        }
        else {
            throw error;
        }
    }
}
/**
 * Command: rule-verify
 */
async function ruleVerify(options) {
    console.log("🔍 Step 1: Validation Check (Rules.yaml + SecurityPolicy.yaml)");
    try {
        const result = await callAPI("/master-control/execute", "POST", {
            command: "rule-verify",
            params: {
                strict: options.strict || false,
                source: "rules.yaml",
                policy: "securityPolicy.yaml",
            },
        });
        console.log("\n📋 Validation Results:");
        console.log(JSON.stringify(result, null, 2));
        if (result.compliant === false) {
            console.error("\n❌ Validation failed - Non-compliant rules detected");
            process.exit(1);
        }
        else {
            console.log("\n✅ Validation passed");
        }
    }
    catch (error) {
        console.error("❌ Validation error:", error.message);
        process.exit(1);
    }
}
/**
 * Command: github-tag-build (Docker + Git Tag)
 */
async function githubTagBuild(options) {
    const version = options.version || "v6.8.0-rc";
    const isStable = version &&
        !version.includes("-rc") &&
        !version.includes("-beta") &&
        !version.includes("-alpha");
    if (isStable) {
        console.log("🏷️  Step 1: GitHub Tag (Stable)");
    }
    else {
        console.log("🏷️  Step 2: GitHub Tag + Docker Image Build");
    }
    const imageName = options.image_name || "master-control";
    const registry = options.registry || "ghcr.io/cptsystems";
    const fullImageName = `${registry}/${imageName}:${version}`;
    console.log(`\n📦 Configuration:`);
    console.log(`   Version: ${version}`);
    console.log(`   Image: ${fullImageName}`);
    console.log(`   Registry: ${registry}`);
    try {
        // Git tag
        const tagMessage = isStable
            ? `EA Plan Master Control ${version} Stable Release`
            : `Release Candidate - Workflow Execution Stable`;
        if (options.dry_run) {
            console.log(`\n[DRY RUN] Would create Git tag: ${version}`);
            console.log(`[DRY RUN] Message: ${tagMessage}`);
            console.log(`[DRY RUN] Would push tag to origin`);
        }
        else {
            // Check if tag already exists
            try {
                const { stdout: existingTags } = await execAsync("git tag -l");
                if (existingTags.includes(version)) {
                    console.log(`\n⚠️  Git tag ${version} already exists`);
                    console.log("   Skipping tag creation, proceeding with push...");
                }
                else {
                    console.log(`\n🏷️  Creating Git tag: ${version}`);
                    await execAsync(`git tag -a ${version} -m "${tagMessage}"`);
                    console.log("✅ Git tag created locally");
                }
                // Git push tag (will skip if already pushed)
                console.log(`\n📤 Pushing Git tag...`);
                try {
                    await execAsync(`git push origin ${version}`);
                    console.log("✅ Git tag pushed successfully");
                }
                catch (pushError) {
                    if (pushError.stderr?.includes("already exists")) {
                        console.log("⚠️  Tag already exists on remote, skipping push");
                    }
                    else {
                        throw pushError;
                    }
                }
            }
            catch (error) {
                // If tag creation fails but tag exists, try to push
                if (error.stderr?.includes("already exists")) {
                    console.log(`\n⚠️  Tag ${version} already exists locally`);
                    console.log("   Attempting to push existing tag...");
                    try {
                        await execAsync(`git push origin ${version}`);
                        console.log("✅ Git tag pushed successfully");
                    }
                    catch (pushError) {
                        if (pushError.stderr?.includes("already exists")) {
                            console.log("✅ Tag already exists on remote");
                        }
                        else {
                            throw pushError;
                        }
                    }
                }
                else {
                    throw error;
                }
            }
        }
        // Docker build
        if (options.skip_build || options.dry_run) {
            if (options.dry_run) {
                console.log(`\n[DRY RUN] Would build Docker image: ${fullImageName}`);
                console.log(`[DRY RUN] Command: docker build -t ${fullImageName} .`);
                console.log(`[DRY RUN] Would push image to registry`);
            }
            else {
                console.log(`\n⏭️  Skipping Docker build (--skip_build)`);
            }
        }
        else {
            console.log(`\n🐳 Building Docker image: ${fullImageName}`);
            console.log(`   This may take several minutes...`);
            await execAsync(`docker build -t ${fullImageName} .`);
            console.log("✅ Docker image built successfully");
            // Docker push
            console.log(`\n📤 Pushing Docker image...`);
            await execAsync(`docker push ${fullImageName}`);
            console.log("✅ Docker image pushed successfully");
        }
        if (isStable) {
            console.log(`\n✅ Step 1 & 2 completed: ${fullImageName} tagged and built (Stable Release)`);
        }
        else {
            console.log(`\n✅ Step 2 completed: ${fullImageName} tagged and built`);
        }
    }
    catch (error) {
        console.error("❌ Build error:", error.message);
        if (error.stdout)
            console.error("STDOUT:", error.stdout);
        if (error.stderr)
            console.error("STDERR:", error.stderr);
        process.exit(1);
    }
}
/**
 * Command: phase-update
 */
async function phaseUpdate(options) {
    console.log("🚀 Step 3: Deploy Phase 7");
    const targetPhase = options.target || "v6.8.0";
    try {
        const result = await callAPI("/master-control/execute", "POST", {
            workflow: [
                {
                    step: "phase-update",
                    target_phase: targetPhase,
                    apply_manifests: options.apply_manifests !== false,
                    commit_changes: options.commit_changes || false,
                },
            ],
            auto_commit: options.commit_changes || false,
            validation: true,
        });
        console.log("\n📋 Deployment Results:");
        console.log(JSON.stringify(result, null, 2));
        if (result.status === "failed" || result.error) {
            console.error("\n❌ Deployment failed");
            process.exit(1);
        }
        else {
            console.log("\n✅ Phase 7 deployment completed");
        }
    }
    catch (error) {
        console.error("❌ Deployment error:", error.message);
        process.exit(1);
    }
}
/**
 * Command: argocd-sync
 */
async function argocdSync(options) {
    console.log("🔄 Step 3: ArgoCD Sync (Production)");
    const appName = options.argocd_app || process.env.ARGOCD_APP_NAME || "ea-plan-v6";
    const timeout = options.sync_timeout || 300;
    if (options.dry_run) {
        console.log(`\n[DRY RUN] Would sync ArgoCD app: ${appName}`);
        console.log(`[DRY RUN] Timeout: ${timeout} seconds`);
        console.log(`[DRY RUN] Would trigger ArgoCD sync via API`);
        console.log(`[DRY RUN] Expected result: Synced status`);
        return;
    }
    try {
        const result = await callAPI("/master-control/execute", "POST", {
            workflow: [
                {
                    step: "argocd-sync",
                    argocd_app: appName,
                    sync_timeout: timeout,
                },
            ],
        });
        console.log("\n📋 ArgoCD Sync Results:");
        console.log(JSON.stringify(result, null, 2));
        const syncStep = result.steps?.find((s) => s.step === "argocd-sync");
        if (syncStep?.status === "failed" || !syncStep?.result?.synced) {
            // Check if this is called from resume mode
            const isResumeMode = process.argv.includes("--resume");
            if (isResumeMode) {
                console.log("\n⚠️  ArgoCD sync failed (resume mode - continuing)");
                console.log("   Error:", syncStep?.error || "Unknown error");
                console.log("   Note: Production ArgoCD config required for full sync");
                // Don't exit, allow workflow to continue
                return;
            }
            else {
                console.error("\n❌ ArgoCD sync failed");
                console.error("Error:", syncStep?.error || "Unknown error");
                process.exit(1);
            }
        }
        else {
            const syncResult = syncStep?.result;
            console.log("\n✅ ArgoCD sync completed");
            console.log(`   App: ${syncResult?.app || appName}`);
            console.log(`   Status: ${syncResult?.status || "Unknown"}`);
            console.log(`   Health: ${syncResult?.health || "Unknown"}`);
            console.log(`   Revision: ${syncResult?.revision || "N/A"}`);
            if (syncResult?.syncTime) {
                console.log(`   Sync Time: ${syncResult.syncTime}`);
            }
        }
    }
    catch (error) {
        console.error("❌ ArgoCD sync error:", error.message);
        process.exit(1);
    }
}
/**
 * Command: observe
 */
async function observe(options) {
    console.log("📊 Step 4: Observability Check");
    const targets = options.targets
        ? options.targets.split(",").map((t) => t.trim())
        : ["prometheus", "grafana"];
    if (options.dry_run) {
        console.log(`\n[DRY RUN] Would check observability targets: ${targets.join(", ")}`);
        console.log(`[DRY RUN] Verify: ${options.verify !== false ? "enabled" : "disabled"}`);
        console.log(`[DRY RUN] Would query Prometheus and Grafana via API`);
        console.log(`[DRY RUN] Expected metrics: up, cpu_usage_seconds_total, http_requests_total`);
        return;
    }
    try {
        const result = await callAPI("/master-control/execute", "POST", {
            workflow: [
                {
                    step: options.verify ? "observability-verify" : "observe",
                    targets,
                    metrics: ["up", "cpu_usage_seconds_total", "http_requests_total"],
                },
            ],
            observability_check: true,
        });
        console.log("\n📋 Observability Results:");
        console.log(JSON.stringify(result, null, 2));
        if (options.verify) {
            const verified = result.steps?.[0]?.result?.verified;
            if (!verified) {
                // Check if this is called from resume mode
                const isResumeMode = process.argv.includes("--resume");
                if (isResumeMode) {
                    console.log("\n⚠️  Observability verification failed (resume mode - continuing)");
                    const issues = result.steps?.[0]?.result?.issues || [];
                    if (issues.length > 0) {
                        console.log("   Issues:", issues.join(", "));
                    }
                    console.log("   Note: Production observability endpoints required for full verification");
                    // Don't exit, allow workflow to continue
                }
                else {
                    console.error("\n❌ Observability verification failed");
                    const issues = result.steps?.[0]?.result?.issues || [];
                    if (issues.length > 0) {
                        console.error("Issues:", issues.join(", "));
                    }
                    process.exit(1);
                }
            }
            else {
                console.log("\n✅ Observability verification passed");
            }
        }
        else {
            console.log("\n✅ Observability check completed");
        }
    }
    catch (error) {
        console.error("❌ Observability error:", error.message);
        process.exit(1);
    }
}
/**
 * Command: execute (Full Stable Release Execution)
 */
async function execute(options) {
    // Initialize master context if persistent/append mode enabled
    if (options.persistent || options.prompt_append) {
        await initializeMasterContext(options);
        if (!options.resume) {
            await appendToMasterContext("INIT", "Master Control v6.8.0 - Prompt Append Chain initialized", options);
        }
    }
    const isStableRelease = options.stable_release || false;
    const isResume = options.resume || false;
    if (isStableRelease) {
        if (isResume) {
            // Resume mode: Skip Step 1 (Git Tag already done), continue from Step 2
            console.log("🔄 RESUMING Production Deployment from Step 2...");
            console.log("   Skipping Step 1 (Git Tag already completed)");
            await appendToMasterContext("RESUME", "🔄 Resuming deployment from Step 2 (ArgoCD Sync)", options);
        }
        else {
            const executionLog = "🚀 EA Plan Master Control v6.8.0 — Full Stable Release Execution\n";
            console.log(executionLog);
            await appendToMasterContext("EXECUTION_START", executionLog, options);
            // Step 1: GitHub Tag + Docker Build
            console.log("═".repeat(60));
            console.log("STEP 1: GitHub Tag (Stable) + Docker Image Build");
            console.log("═".repeat(60));
            const step1Output = [];
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                step1Output.push(args.join(" "));
                originalConsoleLog(...args);
            };
            await githubTagBuild({
                ...options,
                version: options.version || "v6.8.0",
            });
            console.log = originalConsoleLog;
            await appendToMasterContext("STEP_1", step1Output.join("\n"), options);
        }
        // Step 2: ArgoCD Sync
        const step2Header = "\n" +
            "═".repeat(60) +
            "\nSTEP 2: ArgoCD Sync (Production)\n" +
            "═".repeat(60) +
            "\n";
        console.log(step2Header);
        const step2Output = [step2Header];
        const originalConsoleLog2 = console.log;
        console.log = (...args) => {
            step2Output.push(args.join(" "));
            originalConsoleLog2(...args);
        };
        try {
            await argocdSync({
                ...options,
                argocd_app: options.argocd_app || "ea-plan-v6",
                sync_timeout: options.sync_timeout || 300,
            });
        }
        catch (error) {
            // In resume mode, continue even if ArgoCD sync fails (might not be configured yet)
            if (isResume) {
                console.log("\n⚠️  ArgoCD sync failed, but continuing with remaining steps (resume mode)...");
                console.log("   Error:", error.message || "Unknown error");
                console.log("   Note: Set ARGOCD_SERVER_URL and ARGOCD_TOKEN for production sync");
                logger.warn("ArgoCD sync failed in resume mode, continuing", {
                    error: error.message,
                });
                // Continue to next step instead of throwing
            }
            else {
                throw error;
            }
        }
        console.log = originalConsoleLog2;
        await appendToMasterContext("STEP_2", step2Output.join("\n"), options);
        // Step 3: Observability Validation
        console.log("\n" + "═".repeat(60));
        console.log("STEP 3: Observability Validation");
        console.log("═".repeat(60));
        await observe({
            ...options,
            targets: options.targets || "prometheus,grafana",
            verify: options.verify !== false,
        });
        // Step 4: Full Cycle & Self-Update
        console.log("\n" + "═".repeat(60));
        console.log("STEP 4: Full Cycle & Self-Update");
        console.log("═".repeat(60));
        await executeFullCycle({
            ...options,
            full_cycle: options.full_cycle !== false,
            self_update: options.self_update !== false,
        });
        console.log("\n" + "═".repeat(60));
        console.log("✅ Full Stable Release Execution Completed Successfully!");
        console.log("═".repeat(60));
    }
    else {
        // Legacy execute behavior
        console.log("🔄 Step 5: Self-Update & Auto-Commit");
        await executeFullCycle(options);
    }
}
/**
 * Execute full cycle (internal)
 */
async function executeFullCycle(options) {
    if (options.dry_run) {
        console.log(`\n[DRY RUN] Would execute full cycle`);
        console.log(`[DRY RUN] Full cycle: ${options.full_cycle !== false}`);
        console.log(`[DRY RUN] Self-update: ${options.self_update !== false}`);
        console.log(`[DRY RUN] Auto-commit: ${options.auto_commit !== false}`);
        return;
    }
    try {
        const result = await callAPI("/master-control/execute", "POST", {
            workflow: [],
            full_cycle: options.full_cycle || false,
            self_update: options.self_update !== false,
            auto_commit: options.auto_commit !== false,
            validation: options.validation || false,
            observability_check: options.observability_check || false,
        });
        console.log("\n📋 Execution Results:");
        if (result.summary) {
            console.log("\n📊 Summary:");
            console.log(JSON.stringify(result.summary, null, 2));
        }
        else {
            console.log(JSON.stringify(result, null, 2));
        }
        if (result.success === false || result.error) {
            console.error("\n❌ Execution failed");
            process.exit(1);
        }
        else {
            console.log("\n✅ Execution completed successfully");
        }
    }
    catch (error) {
        console.error("❌ Execution error:", error.message);
        process.exit(1);
    }
}
/**
 * Main CLI handler
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
EA Plan Master Control CLI v6.8.0-rc

Usage:
  master-control <command> [options]

Commands:
  rule-verify                  Validation Check (Rules.yaml + SecurityPolicy.yaml)
  github-tag-build             GitHub Tag + Docker Image Build
  argocd-sync                  ArgoCD Sync (Production)
  phase-update                 Deploy Phase 7
  observe                      Observability Check
  execute                      Self-Update & Auto-Commit

Options:
  --strict                     Strict validation mode
  --target <version>           Target phase version (e.g., v6.8.0)
  --apply_manifests           Apply Kubernetes manifests
  --commit_changes             Auto-commit changes
  --targets <list>             Comma-separated targets (e.g., prometheus,grafana)
  --verify                     Verify observability status
  --full_cycle                 Execute full cycle
  --self_update                Trigger self-update
  --validation                 Enable validation
  --observability_check        Enable observability check
  --auto_commit                Auto-commit changes
  --version <tag>              Version tag (e.g., v6.8.0-rc)
  --image_name <name>          Docker image name
  --registry <url>             Docker registry URL
  --argocd_app <name>          ArgoCD application name
  --sync_timeout <seconds>     ArgoCD sync timeout
  --stable_release             Execute full stable release workflow
  --dry_run                    Show commands without executing
  --skip_build                 Skip Docker build (faster testing)
  --persistent                 Enable persistent orchestrator mode
  --prompt_append              Enable prompt append chain mode (incremental context)
  --resume                     Resume deployment from where it stopped (skip completed steps)

Examples:
  master-control rule-verify --strict
  master-control github-tag-build --version v6.8.0-rc --registry ghcr.io/cptsystems
  master-control phase-update --target v6.8.0 --apply_manifests --commit_changes
  master-control observe --targets prometheus,grafana --verify
  master-control execute --full_cycle --self_update

Stable Release Workflow (Individual Steps):
  # 1. GitHub Tag (Stable) + Docker Image Push
  master-control github-tag-build --version v6.8.0
  
  # 2. ArgoCD Sync (Production)
  master-control argocd-sync --argocd_app ea-plan-v6 --sync_timeout 300
  
  # 3. Observability Validation
  master-control observe --targets prometheus,grafana --verify
  
  # 4. Full Cycle & Self-Update
  master-control execute --full_cycle --self_update

Full Stable Release Execution (Single Command):
  master-control execute --full_cycle --self_update --stable_release \\
    --version v6.8.0 \\
    --registry ghcr.io/cptsystems \\
    --argocd_app ea-plan-v6 \\
    --sync_timeout 300 \\
    --targets prometheus,grafana \\
    --verify

Fast Testing (Skip Build):
  master-control execute --stable_release --skip_build --dry_run

Production Execution (Full):
  master-control execute --full_cycle --self_update --stable_release \\
    --version v6.8.0 \\
    --registry ghcr.io/cptsystems \\
    --argocd_app ea-plan-v6 \\
    --sync_timeout 300 \\
    --targets prometheus,grafana \\
    --verify

Resume Deployment (After Configuration):
  master-control execute --resume --full_cycle --self_update --stable_release \\
    --persistent --prompt_append \\
    --argocd_app ea-plan-v6 \\
    --sync_timeout 300 \\
    --targets prometheus,grafana \\
    --verify
`);
        process.exit(0);
    }
    const command = args[0];
    const options = {};
    // Parse options
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg !== "string") {
            continue;
        }
        if (arg.startsWith("--")) {
            const key = arg.substring(2).replace(/-/g, "_");
            const nextArg = args[i + 1];
            // Boolean flags
            const booleanFlags = [
                "strict",
                "apply_manifests",
                "commit_changes",
                "verify",
                "full_cycle",
                "self_update",
                "validation",
                "observability_check",
                "auto_commit",
                "stable_release",
                "dry_run",
                "skip_build",
                "persistent",
                "prompt_append",
                "resume",
            ];
            if (booleanFlags.includes(key)) {
                options[key] = true;
            }
            else if (typeof nextArg === "string" && !nextArg.startsWith("--")) {
                // Value flags
                if (key === "target")
                    options.target = nextArg;
                else if (key === "targets")
                    options.targets = nextArg;
                else if (key === "version")
                    options.version = nextArg;
                else if (key === "image_name")
                    options.image_name = nextArg;
                else if (key === "registry")
                    options.registry = nextArg;
                else if (key === "argocd_app")
                    options.argocd_app = nextArg;
                else if (key === "sync_timeout")
                    options.sync_timeout = parseInt(nextArg, 10);
                i++; // Skip next arg as it's the value
            }
        }
    }
    try {
        switch (command) {
            case "rule-verify":
                await ruleVerify(options);
                break;
            case "github-tag-build":
                await githubTagBuild(options);
                break;
            case "phase-update":
                await phaseUpdate(options);
                break;
            case "argocd-sync":
                await argocdSync(options);
                break;
            case "observe":
                await observe(options);
                break;
            case "execute":
                await execute(options);
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Run "master-control" without arguments to see usage');
                process.exit(1);
        }
    }
    catch (error) {
        logger.error("CLI error", { error: error.message, stack: error.stack });
        console.error("❌ Command failed:", error.message);
        process.exit(1);
    }
}
// Run CLI
main().catch((error) => {
    logger.error("CLI fatal error", { error });
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=masterControl.js.map