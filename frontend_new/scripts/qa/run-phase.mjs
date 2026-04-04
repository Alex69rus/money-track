import { chromium } from "playwright";
import { phase2Definition } from "./phases/phase2.mjs";
import { phase3Definition } from "./phases/phase3.mjs";

const PHASES = {
  [phase2Definition.id]: phase2Definition,
  [phase3Definition.id]: phase3Definition,
};

function failResult(frIds, message) {
  return Object.fromEntries(
    frIds.map((frId) => [
      frId,
      {
        pass: false,
        evidence: message,
      },
    ]),
  );
}

function mergeFrResults(frIds, partial, fallback) {
  const merged = {};
  for (const frId of frIds) {
    merged[frId] = partial[frId] ?? {
      pass: false,
      evidence: fallback,
    };
  }
  return merged;
}

async function main() {
  const phaseId = process.argv[2] ?? "phase2";
  const phase = PHASES[phaseId];

  if (!phase) {
    const available = Object.keys(PHASES).sort().join(", ");
    console.error(`Unknown QA phase "${phaseId}". Available phases: ${available}`);
    process.exit(2);
  }

  const frontendBaseUrl = (process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:4173").replace(/\/$/, "");
  const backendBaseUrl = (process.env.QA_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

  const consoleErrors = [];
  const networkErrors = [];

  let browser;
  let context;
  let page;

  let fr = {};
  let artifacts = {};
  let runError = null;

  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu"],
    });
    context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    page = await context.newPage();
    page.__mainFrameNavigations = 0;

    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        page.__mainFrameNavigations += 1;
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (request) => {
      networkErrors.push(
        `${request.method()} ${request.url()} -> ${request.failure()?.errorText ?? "request failed"}`,
      );
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.request().method()} ${response.url()} -> HTTP ${response.status()}`);
      }
    });

    const runResult = await phase.run({
      page,
      frontendBaseUrl,
      backendBaseUrl,
    });
    fr = runResult.fr ?? {};
    artifacts = runResult.artifacts ?? {};
  } catch (error) {
    runError = error instanceof Error ? error.message : String(error);
    fr = failResult(phase.frIds, `Phase QA execution failed: ${runError}`);
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  const frMatrix = mergeFrResults(
    phase.frIds,
    fr,
    runError ? `Phase QA execution failed: ${runError}` : "Phase QA did not report this FR.",
  );
  const allPass = Object.values(frMatrix).every((result) => result.pass);

  const report = {
    phase: phase.id,
    runtime_url: `${frontendBaseUrl}/transactions`,
    backend_url: backendBaseUrl,
    all_pass: allPass,
    fr: frMatrix,
    console_errors: consoleErrors,
    network_errors: networkErrors,
    artifacts,
    error: runError,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(allPass ? 0 : 1);
}

await main();
