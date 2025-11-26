import { Router } from "express";
import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const router = Router();

const WEBSHOTS_DIR = path.join(process.cwd(), "webshots");
if (!fs.existsSync(WEBSHOTS_DIR)) {
  fs.mkdirSync(WEBSHOTS_DIR, { recursive: true });
}

type WebSession = {
  browser: Browser;
  page: Page;
  shotIndex: number;
  currentUrl: string;
};

const sessions = new Map<string, WebSession>();

type Recipe = {
  name: string;
  steps: Array<{ action: string; args?: Record<string, any> }>;
  createdAt: string;
};

const recipesStore: Recipe[] = [];

function generateSessionId(): string {
  return "ws-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function takeScreenshot(session: WebSession, sessionId: string): Promise<string> {
  session.shotIndex += 1;
  const filename = `${sessionId}-${session.shotIndex}.png`;
  const filepath = path.join(WEBSHOTS_DIR, filename);
  try {
    await session.page.screenshot({ path: filepath, fullPage: false });
  } catch (err) {
    console.error("[WEBAGENT] Screenshot error:", err);
  }
  return `/webshots/${filename}`;
}

router.post("/agent/web/open", async (req, res) => {
  const { url } = (req.body ?? {}) as { url?: string };
  console.log("[WEBAGENT] Opening session, URL:", url || "(blank)");

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    const sessionId = generateSessionId();
    const session: WebSession = {
      browser,
      page,
      shotIndex: 0,
      currentUrl: page.url(),
    };

    sessions.set(sessionId, session);

    const screenshotUrl = await takeScreenshot(session, sessionId);

    res.json({
      ok: true,
      sessionId,
      screenshotUrl,
      currentUrl: session.currentUrl,
    });
  } catch (err: any) {
    console.error("[WEBAGENT] Failed to open session:", err);
    res.json({
      ok: false,
      error: err?.message || "Failed to launch browser",
    });
  }
});

router.post("/agent/web/step", async (req, res) => {
  const { sessionId, action, args } = (req.body ?? {}) as {
    sessionId?: string;
    action?: string;
    args?: Record<string, any>;
  };

  if (!sessionId || !action) {
    return res.json({ ok: false, error: "sessionId and action required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.json({ ok: false, error: "Session not found" });
  }

  console.log("[WEBAGENT] Step:", action, args);

  try {
    const { page } = session;
    const engine = args?.engine || "css";

    switch (action) {
      case "goto": {
        const targetUrl = args?.url;
        if (!targetUrl) {
          return res.json({ ok: false, error: "url required for goto" });
        }
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        break;
      }

      case "click": {
        const selector = args?.selector;
        if (!selector) {
          return res.json({ ok: false, error: "selector required for click" });
        }
        const locator = engine === "xpath" 
          ? page.locator(`xpath=${selector}`)
          : page.locator(selector);
        await locator.first().click({ timeout: 10000 });
        break;
      }

      case "type": {
        const selector = args?.selector;
        const text = args?.text ?? "";
        if (!selector) {
          return res.json({ ok: false, error: "selector required for type" });
        }
        const locator = engine === "xpath"
          ? page.locator(`xpath=${selector}`)
          : page.locator(selector);
        await locator.first().fill(text, { timeout: 10000 });
        break;
      }

      case "waitFor": {
        const selector = args?.selector;
        if (!selector) {
          return res.json({ ok: false, error: "selector required for waitFor" });
        }
        const locator = engine === "xpath"
          ? page.locator(`xpath=${selector}`)
          : page.locator(selector);
        await locator.first().waitFor({ state: "visible", timeout: 15000 });
        break;
      }

      case "wait": {
        const ms = Number(args?.ms) || 1000;
        await page.waitForTimeout(ms);
        break;
      }

      case "screenshot": {
        break;
      }

      default:
        return res.json({ ok: false, error: `Unknown action: ${action}` });
    }

    session.currentUrl = page.url();
    const screenshotUrl = await takeScreenshot(session, sessionId);

    res.json({
      ok: true,
      screenshotUrl,
      currentUrl: session.currentUrl,
    });
  } catch (err: any) {
    console.error("[WEBAGENT] Step error:", err);
    res.json({
      ok: false,
      error: err?.message || "Step failed",
    });
  }
});

router.post("/agent/web/screenshot", async (req, res) => {
  const { sessionId } = (req.body ?? {}) as { sessionId?: string };

  if (!sessionId) {
    return res.json({ ok: false, error: "sessionId required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.json({ ok: false, error: "Session not found" });
  }

  try {
    session.currentUrl = session.page.url();
    const screenshotUrl = await takeScreenshot(session, sessionId);

    res.json({
      ok: true,
      screenshotUrl,
      currentUrl: session.currentUrl,
    });
  } catch (err: any) {
    console.error("[WEBAGENT] Screenshot error:", err);
    res.json({
      ok: false,
      error: err?.message || "Screenshot failed",
    });
  }
});

router.post("/agent/web/close", async (req, res) => {
  const { sessionId } = (req.body ?? {}) as { sessionId?: string };

  if (!sessionId) {
    return res.json({ ok: false, error: "sessionId required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.json({ ok: false, error: "Session not found" });
  }

  console.log("[WEBAGENT] Closing session:", sessionId);

  try {
    await session.browser.close();
    sessions.delete(sessionId);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[WEBAGENT] Close error:", err);
    sessions.delete(sessionId);
    res.json({ ok: true });
  }
});

router.get("/agent/web/recipes", (_req, res) => {
  res.json(recipesStore);
});

router.post("/agent/web/recipes", (req, res) => {
  const { name, steps } = (req.body ?? {}) as {
    name?: string;
    steps?: Array<{ action: string; args?: Record<string, any> }>;
  };

  if (!name || !steps) {
    return res.status(400).json({ error: "name and steps required" });
  }

  const recipe: Recipe = {
    name,
    steps,
    createdAt: new Date().toISOString(),
  };

  recipesStore.push(recipe);
  console.log("[WEBAGENT] Recipe saved:", name);

  res.json(recipesStore);
});

export default router;
