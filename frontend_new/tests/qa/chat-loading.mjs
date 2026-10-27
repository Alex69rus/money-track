import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";
import { installTelegramFixture } from "./telegram-fixture.mjs";

// Exercise actual production chunks: dev-server module loading cannot prove
// that charts stay out of the initial download or that reload retries a chunk.
const artifacts = resolve(".codex-tmp/chat-loading");
mkdirSync(artifacts, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 0, strictPort: true } });
let browser;
try {
  const address = server.httpServer.address();
  assert(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const report = {};

  for (const scenario of ["delayed", "failed"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    await installTelegramFixture(context);
    await context.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let chunkRequests = 0;
    let releaseChunk;
    const gate = new Promise((resolveGate) => { releaseChunk = resolveGate; });
    await page.route(/\/assets\/AiChatPage-[^/]+\.js$/, async (route) => {
      chunkRequests += 1;
      if (scenario === "failed" && chunkRequests === 1) {
        await route.abort("failed");
        return;
      }
      if (scenario === "delayed") await gate;
      await route.continue();
    });

    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    assert.equal(chunkRequests, 0, "Chat must not download on another primary route");
    await page.getByRole("link", { name: "Open AI Chat" }).click();

    if (scenario === "delayed") {
      await page.getByText("Loading AI Chat…").waitFor();
      assert(await page.getByRole("navigation", { name: "Primary navigation" }).isVisible());
      await page.screenshot({ path: resolve(artifacts, "loading.png") });
      // Navigating away during a download must remain usable.
      await page.getByRole("link", { name: "Open Settings" }).click();
      await page.getByRole("heading", { name: "Settings" }).waitFor();
      releaseChunk();
      await page.getByRole("link", { name: "Open AI Chat" }).click();
    } else {
      await page.getByRole("alert").filter({ hasText: "Could not open AI Chat" }).waitFor();
      assert(await page.getByRole("button", { name: "Reload AI Chat" }).isVisible());
      await page.screenshot({ path: resolve(artifacts, "failed.png") });
      await page.getByRole("link", { name: "Open Settings" }).click();
      await page.getByRole("heading", { name: "Settings" }).waitFor();
      await page.getByRole("link", { name: "Open AI Chat" }).click();
      await page.getByRole("button", { name: "Reload AI Chat" }).click();
    }

    await page.getByTestId("ai-chat-input").waitFor();
    assert.equal(chunkRequests, scenario === "failed" ? 2 : 1);
    assert(await page.getByRole("navigation", { name: "Primary navigation" }).isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (scenario === "delayed") assert.deepEqual(errors, []);
    else assert(errors.every((error) => /Failed to fetch dynamically imported module/.test(error)), errors.join("\n"));
    await page.screenshot({ path: resolve(artifacts, `${scenario}-recovered.png`) });
    report[scenario] = { pass: true, chunkRequests, expectedChunkErrors: errors };
    await context.close();
  }
  writeFileSync(resolve(artifacts, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, artifacts }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolveClose, rejectClose) => server.httpServer.close((error) => error ? rejectClose(error) : resolveClose()));
}
