import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

type StepStatus = "queued" | "running" | "done" | "failed";

interface RunStep {
  id: string;
  action: string;
  args: Record<string, any>;
  status: StepStatus;
  result?: string;
  error?: string;
}

interface AgentRun {
  runId: string;
  status: "running" | "paused" | "completed" | "failed" | "stopped";
  steps: RunStep[];
  currentUrl: string;
  lastScreenshot: string;
  logs: string[];
  sessionId: string | null;
  createdAt: number;
}

const runs = new Map<string, AgentRun>();

function generateRunId(): string {
  return "run-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

function generateStepId(): string {
  return "step-" + Math.random().toString(36).slice(2, 8);
}

export function normalizeUrl(input: string): { url: string; error?: string } {
  if (!input || typeof input !== "string") {
    return { url: "", error: "URL is required" };
  }

  let url = input.trim();

  if (url.startsWith("file://") || url.startsWith("javascript:") || url.startsWith("data:")) {
    return { url: "", error: "Only http and https URLs are supported" };
  }

  if (!url.match(/^https?:\/\//i)) {
    if (url.startsWith("www.")) {
      url = "https://" + url;
    } else if (url.includes(".") && !url.includes(" ")) {
      url = "https://" + url;
    } else {
      return { url: "", error: `Invalid URL format: "${input}". Please provide a valid web address.` };
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { url: "", error: "Only http and https URLs are supported" };
    }
    return { url: parsed.href };
  } catch {
    return { url: "", error: `Could not parse URL: "${input}"` };
  }
}

function parseMessageToSteps(message: string): RunStep[] {
  const steps: RunStep[] = [];
  const lower = message.toLowerCase();

  const gotoPatterns = [
    /(?:go to|navigate to|open|visit|browse to)\s+(?:the\s+)?(?:website\s+)?["']?([^\s"']+)["']?/i,
    /(?:go to|navigate to|open|visit|browse to)\s+(.+?)(?:\s+and|\s+then|$)/i,
  ];

  for (const pattern of gotoPatterns) {
    const match = message.match(pattern);
    if (match) {
      const rawUrl = match[1].trim().replace(/[.,!?]+$/, "");
      const { url, error } = normalizeUrl(rawUrl);
      if (url) {
        steps.push({
          id: generateStepId(),
          action: "goto",
          args: { url },
          status: "queued",
        });
      } else if (error) {
        steps.push({
          id: generateStepId(),
          action: "error",
          args: { message: error },
          status: "failed",
          error,
        });
      }
      break;
    }
  }

  const clickPatterns = [
    /click\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']/i,
    /click\s+(?:on\s+)?(?:the\s+)?(\S+)\s+(?:button|link|element)/i,
    /click\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+and|\s+then|$)/i,
  ];

  for (const pattern of clickPatterns) {
    const match = message.match(pattern);
    if (match) {
      const target = match[1].trim();
      steps.push({
        id: generateStepId(),
        action: "click",
        args: { selector: `text=${target}`, description: target },
        status: "queued",
      });
      break;
    }
  }

  const typePatterns = [
    /type\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']?([^"']+)["']?/i,
    /enter\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']?([^"']+)["']?/i,
    /fill\s+(?:in\s+)?(?:the\s+)?["']?([^"']+)["']?\s+with\s+["']([^"']+)["']/i,
    /search\s+(?:for\s+)?["']([^"']+)["']/i,
  ];

  for (const pattern of typePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (pattern.source.startsWith("search")) {
        steps.push({
          id: generateStepId(),
          action: "type",
          args: { selector: 'input[type="search"], input[name="q"], input[name="search"], input', text: match[1] },
          status: "queued",
        });
      } else if (pattern.source.includes("fill")) {
        steps.push({
          id: generateStepId(),
          action: "type",
          args: { selector: `[placeholder*="${match[1]}"], [name*="${match[1]}"], input`, text: match[2] },
          status: "queued",
        });
      } else {
        steps.push({
          id: generateStepId(),
          action: "type",
          args: { selector: `[placeholder*="${match[2]}"], [name*="${match[2]}"], input`, text: match[1] },
          status: "queued",
        });
      }
      break;
    }
  }

  if (lower.includes("wait") && !steps.some(s => s.action === "wait")) {
    const waitMatch = message.match(/wait\s+(?:for\s+)?(\d+)\s*(?:seconds?|s)?/i);
    if (waitMatch) {
      steps.push({
        id: generateStepId(),
        action: "wait",
        args: { ms: parseInt(waitMatch[1]) * 1000 },
        status: "queued",
      });
    }
  }

  if (lower.includes("screenshot") || lower.includes("capture") || lower.includes("take a picture")) {
    steps.push({
      id: generateStepId(),
      action: "screenshot",
      args: {},
      status: "queued",
    });
  }

  if (lower.includes("create") && (lower.includes("request") || lower.includes("maintenance"))) {
    steps.push({
      id: generateStepId(),
      action: "parco:createRequest",
      args: { description: message },
      status: "queued",
    });
  }

  if (lower.includes("draft") && (lower.includes("message") || lower.includes("email") || lower.includes("sms"))) {
    steps.push({
      id: generateStepId(),
      action: "parco:createDraft",
      args: { description: message },
      status: "queued",
    });
  }

  if (steps.length === 0) {
    if (lower.match(/zillow|redfin|realtor|trulia|apartments|homes/i)) {
      const siteMatch = lower.match(/(zillow|redfin|realtor|trulia|apartments)/i);
      if (siteMatch) {
        const site = siteMatch[1].toLowerCase();
        const domain = site === "apartments" ? "apartments.com" : `${site}.com`;
        steps.push({
          id: generateStepId(),
          action: "goto",
          args: { url: `https://www.${domain}` },
          status: "queued",
        });
      }
    }
  }

  if (steps.length === 0) {
    steps.push({
      id: generateStepId(),
      action: "info",
      args: { message: `Could not parse actionable steps from: "${message}". Try commands like "go to zillow.com" or "click the search button".` },
      status: "done",
    });
  }

  return steps;
}

async function executeRun(runId: string, baseUrl: string) {
  const run = runs.get(runId);
  if (!run) return;

  run.logs.push(`[${new Date().toLocaleTimeString()}] Starting run...`);

  try {
    const openRes = await fetch(`${baseUrl}/api/agent/web/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "" }),
    });
    const openData = await openRes.json() as any;

    if (!openData.ok) {
      run.status = "failed";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Failed to start browser: ${openData.error}`);
      return;
    }

    run.sessionId = openData.sessionId;
    run.lastScreenshot = openData.screenshotUrl;
    run.currentUrl = openData.currentUrl || "about:blank";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Browser session started`);

    for (const step of run.steps) {
      if (run.status === "stopped" || run.status === "failed") break;

      while (run.status === "paused") {
        await new Promise(r => setTimeout(r, 500));
        if ((run as AgentRun).status === "stopped") break;
      }

      if ((run as AgentRun).status === "stopped") break;

      step.status = "running";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Executing: ${step.action}`);

      try {
        if (step.action === "error" || step.action === "info") {
          step.status = step.action === "error" ? "failed" : "done";
          step.result = step.args.message;
          continue;
        }

        if (step.action.startsWith("parco:")) {
          step.status = "done";
          step.result = `Parco action "${step.action}" would be executed here`;
          run.logs.push(`[${new Date().toLocaleTimeString()}] ${step.result}`);
          continue;
        }

        const stepRes = await fetch(`${baseUrl}/api/agent/web/step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: run.sessionId,
            action: step.action,
            args: step.args,
          }),
        });
        const stepData = await stepRes.json() as any;

        if (!stepData.ok) {
          step.status = "failed";
          step.error = stepData.error;
          run.logs.push(`[${new Date().toLocaleTimeString()}] Step failed: ${stepData.error}`);
        } else {
          step.status = "done";
          step.result = "Completed";
          run.lastScreenshot = stepData.screenshotUrl;
          run.currentUrl = stepData.currentUrl || run.currentUrl;
          run.logs.push(`[${new Date().toLocaleTimeString()}] Step completed - ${run.currentUrl}`);
        }
      } catch (err: any) {
        step.status = "failed";
        step.error = err?.message || "Unknown error";
        run.logs.push(`[${new Date().toLocaleTimeString()}] Error: ${step.error}`);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (run.status === "running") {
      run.status = "completed";
      run.logs.push(`[${new Date().toLocaleTimeString()}] Run completed`);
    }
  } catch (err: any) {
    run.status = "failed";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Run failed: ${err?.message}`);
  }
}

router.post("/agent/execute", async (req: Request, res: Response) => {
  const { message, context } = req.body as { message?: string; context?: any };

  if (!message) {
    return res.status(400).json({ ok: false, error: "message is required" });
  }

  console.log("[AGENT] Execute request:", message);

  const steps = parseMessageToSteps(message);
  const runId = generateRunId();

  const run: AgentRun = {
    runId,
    status: "running",
    steps,
    currentUrl: "",
    lastScreenshot: "",
    logs: [`[${new Date().toLocaleTimeString()}] Parsed ${steps.length} step(s) from message`],
    sessionId: null,
    createdAt: Date.now(),
  };

  runs.set(runId, run);

  const protocol = req.protocol;
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;

  executeRun(runId, baseUrl);

  res.json({ ok: true, runId, steps: steps.map(s => ({ id: s.id, action: s.action, status: s.status })) });
});

router.get("/agent/runs/:runId", (req: Request, res: Response) => {
  const { runId } = req.params;
  const run = runs.get(runId);

  if (!run) {
    return res.status(404).json({ ok: false, error: "Run not found" });
  }

  res.json({
    ok: true,
    run: {
      runId: run.runId,
      status: run.status,
      steps: run.steps,
      currentUrl: run.currentUrl,
      lastScreenshot: run.lastScreenshot,
      logs: run.logs.slice(-50),
    },
  });
});

router.post("/agent/runs/:runId/pause", (req: Request, res: Response) => {
  const { runId } = req.params;
  const run = runs.get(runId);

  if (!run) {
    return res.status(404).json({ ok: false, error: "Run not found" });
  }

  if (run.status === "running") {
    run.status = "paused";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Run paused`);
  }

  res.json({ ok: true, status: run.status });
});

router.post("/agent/runs/:runId/resume", (req: Request, res: Response) => {
  const { runId } = req.params;
  const run = runs.get(runId);

  if (!run) {
    return res.status(404).json({ ok: false, error: "Run not found" });
  }

  if (run.status === "paused") {
    run.status = "running";
    run.logs.push(`[${new Date().toLocaleTimeString()}] Run resumed`);
  }

  res.json({ ok: true, status: run.status });
});

router.post("/agent/runs/:runId/stop", async (req: Request, res: Response) => {
  const { runId } = req.params;
  const run = runs.get(runId);

  if (!run) {
    return res.status(404).json({ ok: false, error: "Run not found" });
  }

  run.status = "stopped";
  run.logs.push(`[${new Date().toLocaleTimeString()}] Run stopped by user`);

  if (run.sessionId) {
    try {
      const protocol = req.protocol;
      const host = req.get("host");
      await fetch(`${protocol}://${host}/api/agent/web/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: run.sessionId }),
      });
    } catch {}
  }

  res.json({ ok: true, status: run.status });
});

export default router;
