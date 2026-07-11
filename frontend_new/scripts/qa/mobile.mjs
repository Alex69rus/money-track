import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { installTelegramFixture } from "./telegram-fixture.mjs";

const PROFILES = [
  { id: "iphone-12-pro", width: 390, height: 844, safeAreaBottom: 34, safeAreaTop: 48 },
  { id: "iphone-15", width: 393, height: 852, safeAreaBottom: 34, safeAreaTop: 48 },
  { id: "iphone-15-pro-max", width: 430, height: 932, safeAreaBottom: 34, safeAreaTop: 48 },
  { id: "iphone-se", width: 375, height: 667, safeAreaBottom: 0, safeAreaTop: 24 },
];

function buildFixtures() {
  const createdAt = new Date().toISOString();
  const categories = [
    {
      id: 401,
      name: "Transport",
      type: "EXPENSE",
      color: "#3b82f6",
      icon: "directions_car",
      parentCategoryId: null,
      orderIndex: 1,
      createdAt,
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: 403 + index,
      name: `Mobile QA category ${index + 1}`,
      type: "EXPENSE",
      color: "#8b5cf6",
      icon: "category",
      parentCategoryId: null,
      orderIndex: index + 3,
      createdAt,
    })),
    {
      id: 402,
      name: "Groceries",
      type: "EXPENSE",
      color: "#22c55e",
      icon: "shopping_cart",
      parentCategoryId: null,
      orderIndex: 2,
      createdAt,
    },
  ];
  const transactions = [
    {
      id: 9001,
      userId: 123456789,
      transactionDate: createdAt,
      amount: -45.6,
      note: "Mobile QA transport payment",
      categoryId: 401,
      tags: ["commute", "qa"],
      currency: "AED",
      smsText: null,
      messageId: null,
      createdAt,
      category: categories[0],
    },
    {
      id: 9002,
      userId: 123456789,
      transactionDate: createdAt,
      amount: -128.35,
      note: "Mobile QA grocery payment with a deliberately long description",
      categoryId: 402,
      tags: ["household"],
      currency: "AED",
      smsText: null,
      messageId: null,
      createdAt,
      category: categories.find((category) => category.id === 402) ?? null,
    },
  ];

  return { categories, transactions };
}

async function installApiFixtures(page) {
  const { categories, transactions } = buildFixtures();
  const transactionResponse = {
    data: transactions,
    hasMore: false,
    skip: 0,
    take: 50,
    totalCount: transactions.length,
  };

  await page.route(/\/api\/categories(?:\?.*)?$/, async (route) => {
    await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify(categories) });
  });
  await page.route(/\/api\/tags(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(["commute", "qa", "household", ...Array.from({ length: 18 }, (_, index) => `mobile-qa-tag-${index + 1}`)]),
    });
  });
  await page.route(/\/api\/transactions(?:\?.*)?$/, async (route) => {
    await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify(transactionResponse) });
  });
}

async function launchBrowserWithFallback() {
  const options = {
    headless: true,
    args: ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu"],
  };

  try {
    return await chromium.launch({ ...options, channel: "chrome" });
  } catch {
    return await chromium.launch(options);
  }
}

async function screenshot(page, directory, name) {
  await page.screenshot({ path: resolve(directory, `${name}.png`), fullPage: false });
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    viewportWidth: window.innerWidth,
    overflowingElements: [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className instanceof SVGAnimatedString ? element.className.baseVal : String(element.className ?? ""),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tagName: element.tagName.toLowerCase(),
          testId: element.getAttribute("data-testid"),
        };
      })
      .filter((element) => element.left < -1 || element.right > window.innerWidth + 1)
      .slice(0, 6),
    scrollWidth: document.documentElement.scrollWidth,
  }));

  const availableWidth = Math.max(result.clientWidth, result.viewportWidth);
  if (result.scrollWidth > availableWidth + 1) {
    throw new Error(
      `${label}: horizontal overflow (${result.scrollWidth}px > ${availableWidth}px): ${JSON.stringify(result.overflowingElements)}.`,
    );
  }
}

async function assertWithinViewport(page, selector, label) {
  const box = await page.locator(selector).boundingBox();
  const viewport = await page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth }));

  if (!box || !viewport || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
    throw new Error(`${label}: ${selector} is not fully reachable in the viewport.`);
  }
}

async function assertBelowTelegramTopInset(page, selector, label) {
  const [box, insets] = await Promise.all([
    page.locator(selector).boundingBox(),
    page.evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      const telegramContentSafeTop = styles.getPropertyValue("--tg-content-safe-area-inset-top").trim();
      const moneyTrackSafeTop = styles.getPropertyValue("--mt-safe-area-inset-top").trim();

      return {
        moneyTrackSafeTop,
        safeTop: Number.parseFloat(telegramContentSafeTop),
        telegramContentSafeTop,
      };
    }),
  ]);

  if (!box || !Number.isFinite(insets.safeTop) || box.y < insets.safeTop) {
    throw new Error(
      `${label}: ${selector} is inside the Telegram service-control inset (${JSON.stringify({ box, ...insets })}).`,
    );
  }
}

async function assertDoesNotOverlap(page, upperSelector, lowerSelector, label) {
  const [upper, lower] = await Promise.all([
    page.locator(upperSelector).boundingBox(),
    page.locator(lowerSelector).boundingBox(),
  ]);

  if (!upper || !lower) {
    throw new Error(`${label}: expected controls were not rendered.`);
  }

  const overlaps = upper.x < lower.x + lower.width && upper.x + upper.width > lower.x && upper.y < lower.y + lower.height && upper.y + upper.height > lower.y;
  if (overlaps) {
    throw new Error(`${label}: ${upperSelector} overlaps ${lowerSelector}: ${JSON.stringify({ upper, lower })}.`);
  }
}

async function assertScrollable(page, selector, label, required = true) {
  const result = await page.locator(selector).evaluate((element) => {
    const scrollTopBefore = element.scrollTop;
    element.scrollTop = element.scrollHeight;
    const styles = window.getComputedStyle(element);
    const dialog = element.closest('[role="dialog"]');
    const dialogStyles = dialog ? window.getComputedStyle(dialog) : null;
    const dialogRect = dialog?.getBoundingClientRect();
    return {
      clientHeight: element.clientHeight,
      dialogHeight: dialogRect?.height ?? null,
      dialogMaxHeight: dialogStyles?.maxHeight ?? null,
      maxHeight: styles.maxHeight,
      stableViewportHeight: window.getComputedStyle(document.documentElement).getPropertyValue("--mt-viewport-stable-height"),
      scrollHeight: element.scrollHeight,
      scrollTopAfter: element.scrollTop,
      scrollTopBefore,
    };
  });

  const canScroll = result.scrollHeight > result.clientHeight && result.scrollTopAfter > result.scrollTopBefore;
  if (required && !canScroll) {
    throw new Error(`${label}: expected a usable scroll region, received ${JSON.stringify(result)}.`);
  }

  return canScroll;
}

async function runProfile(browser, profile, artifactDirectory, frontendBaseUrl) {
  const context = await browser.newContext({
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    viewport: { width: profile.width, height: profile.height },
  });
  await installTelegramFixture(context, {
    safeAreaBottom: profile.safeAreaBottom,
    safeAreaTop: profile.safeAreaTop,
    viewportHeight: profile.height,
    viewportStableHeight: profile.height,
  });

  const page = await context.newPage();
  const profileDirectory = resolve(artifactDirectory, profile.id);
  mkdirSync(profileDirectory, { recursive: true });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} -> ${request.failure()?.errorText ?? "failed"}`);
  });

  try {
    await installApiFixtures(page);

    await page.goto(`${frontendBaseUrl}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="tx-mobile-row-9001"]', { timeout: 30000 });
    await assertNoHorizontalOverflow(page, "transactions");
    const customNavCount = await page.locator('[data-testid="app-shell-nav"]').count();
    if (customNavCount !== 1) {
      throw new Error("Telegram primary screens must render the persistent bottom navigation.");
    }
    await assertWithinViewport(page, '[data-testid="app-shell-nav"]', "transactions navigation");
    await screenshot(page, profileDirectory, "transactions");

    await page.click('[data-testid="tx-mobile-category-9001"]');
    await page.waitForSelector('[data-testid="tx-category-page"]', { timeout: 15000 });
    if (await page.locator('[data-testid="app-shell-nav"]').count()) {
      throw new Error("Nested full-page routes must use Telegram BackButton instead of the primary navigation.");
    }
    await assertBelowTelegramTopInset(page, '[data-testid="tx-category-search"]', "category selector");
    await assertNoHorizontalOverflow(page, "category selector");
    await assertScrollable(page, '[data-testid="tx-category-scroll"]', "category selector");
    await assertWithinViewport(page, '[data-testid="tx-category-update"]', "category selector action");
    await screenshot(page, profileDirectory, "category-selector");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-category-page"]', { state: "hidden", timeout: 15000 });
    if (await page.locator('[data-testid="app-shell-nav"]').count() !== 1) {
      throw new Error("Primary bottom navigation was not restored after Telegram BackButton return.");
    }

    await page.click('[data-testid="tx-mobile-tags-9001"]');
    await page.waitForSelector('[data-testid="tx-tags-page"]', { timeout: 15000 });
    await assertBelowTelegramTopInset(page, '[data-testid="tx-tags-search"]', "tag selector");
    await assertNoHorizontalOverflow(page, "tag selector");
    await assertScrollable(page, '[data-testid="tx-tags-scroll"]', "tag selector");
    await assertWithinViewport(page, '[data-testid="tx-tags-update"]', "tag selector action");
    await screenshot(page, profileDirectory, "tag-selector");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-tags-page"]', { state: "hidden", timeout: 15000 });

    await page.click('[data-testid="tx-mobile-edit-9001"]');
    await page.waitForSelector('[data-testid="tx-edit-page"]', { timeout: 15000 });
    await assertBelowTelegramTopInset(page, '#transaction-edit-currency', "transaction editor");
    await assertNoHorizontalOverflow(page, "transaction editor");
    await assertScrollable(page, '[data-testid="tx-edit-scroll"]', "transaction editor", false);
    await assertWithinViewport(page, '[data-testid="tx-edit-save"]', "transaction editor action");
    await page.locator('#transaction-edit-note').focus();
    const keyboardViewportHeight = Math.max(420, profile.height - 320);
    await page.setViewportSize({ width: profile.width, height: keyboardViewportHeight });
    await page.evaluate((viewportHeight) => {
      window.__qaTelegram.setViewport({ viewportHeight, viewportStableHeight: window.__qaTelegram.getState().viewportStableHeight });
    }, keyboardViewportHeight);
    await page.waitForTimeout(250);
    const focusPosition = await page.locator('#transaction-edit-note').evaluate((element) => {
      const scrollContainer = element.closest('[data-focus-scroll-container]');
      return {
        top: element.getBoundingClientRect().top,
        scrollTop: scrollContainer?.scrollTop ?? 0,
      };
    });
    if (focusPosition.scrollTop <= 0 || focusPosition.top > 180) {
      throw new Error(`transaction editor focus positioning failed: ${JSON.stringify(focusPosition)}.`);
    }
    await page.setViewportSize({ width: profile.width, height: profile.height });
    await page.evaluate((viewportHeight) => {
      window.__qaTelegram.setViewport({ viewportHeight, viewportStableHeight: viewportHeight });
    }, profile.height);
    await screenshot(page, profileDirectory, "transaction-editor");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-edit-page"]', { state: "hidden", timeout: 15000 });

    await page.goto(`${frontendBaseUrl}/analytics`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
    await assertNoHorizontalOverflow(page, "analytics");
    await screenshot(page, profileDirectory, "analytics");

    await page.click('[data-testid^="analytics-category-item-"]');
    await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
    if (await page.locator('[data-testid="app-shell-nav"]').count()) {
      throw new Error("Analytics drilldown must hide primary navigation while Telegram BackButton is active.");
    }
    await screenshot(page, profileDirectory, "analytics-drilldown");
    await page.evaluate(() => window.__qaTelegram.pressBack());

    await page.evaluate(() => {
      ["viewportChanged", "safeAreaChanged", "contentSafeAreaChanged", "fullscreenChanged"].forEach((event) => {
        window.__qaTelegram.emit(event);
      });
    });
    const telegramState = await page.evaluate(() => window.__qaTelegram.getState());
    const requiredEvents = ["contentSafeAreaChanged", "fullscreenChanged", "safeAreaChanged", "viewportChanged"];
    const hasViewportSubscriptions = requiredEvents.every((event) => telegramState.registeredEvents.includes(event));
    if (
      telegramState.readyCalls < 1 ||
      telegramState.expandCalls < 1 ||
      !hasViewportSubscriptions ||
      telegramState.backButtonShowCalls < 1 ||
      telegramState.disableVerticalSwipesCalls < 1 ||
      telegramState.fullscreenRequests < 1
    ) {
      throw new Error(
        `Telegram fixture did not observe the expected lifecycle and viewport subscriptions: ${JSON.stringify(telegramState)}.`,
      );
    }

    return {
      pass: true,
      screenshots: profileDirectory,
      telegram: telegramState,
    };
  } catch (error) {
    await screenshot(page, profileDirectory, "failure").catch(() => undefined);
    return {
      pass: false,
      error: error instanceof Error ? error.message : String(error),
      console_errors: consoleErrors,
      failed_requests: failedRequests,
      screenshots: profileDirectory,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const frontendBaseUrl = (process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:4173").replace(/\/$/, "");
  const artifactDirectory = resolve(
    process.env.QA_MOBILE_ARTIFACT_DIR ?? `.codex-tmp/mobile-qa/${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  mkdirSync(artifactDirectory, { recursive: true });

  const requestedProfile = process.env.QA_MOBILE_PROFILE;
  const profiles = requestedProfile ? PROFILES.filter((profile) => profile.id === requestedProfile) : PROFILES;
  if (profiles.length === 0) {
    throw new Error(`Unknown QA_MOBILE_PROFILE: ${requestedProfile}`);
  }

  const browser = await launchBrowserWithFallback();
  const results = [];
  try {
    for (const profile of profiles) {
      results.push(await runProfile(browser, profile, artifactDirectory, frontendBaseUrl));
    }
  } finally {
    await browser.close();
  }

  const report = {
    all_pass: results.every((result) => result.pass),
    artifact_directory: artifactDirectory,
    frontend_url: frontendBaseUrl,
    profiles: Object.fromEntries(profiles.map((profile, index) => [profile.id, results[index]])),
  };
  const reportFile = process.env.QA_MOBILE_REPORT_FILE;
  if (reportFile) {
    mkdirSync(dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.all_pass ? 0 : 1;
}

await main();
