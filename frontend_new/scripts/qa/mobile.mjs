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
const TELEGRAM_HOST_CONTROLS_MIN_TOP_PX = 96;

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
      amount: -12000,
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
    {
      id: 9003,
      userId: 123456789,
      transactionDate: createdAt,
      amount: 17.5,
      note: "Mobile QA uncategorized payment",
      categoryId: null,
      tags: [],
      currency: "AED",
      smsText: null,
      messageId: null,
      createdAt,
      category: null,
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
      body: JSON.stringify([
        "commute",
        "qa",
        "household",
        ...Array.from({ length: 118 }, (_, index) => `mobile-qa-tag-${index + 1}`),
        "very-long-system-generated-filter-tag-that-must-never-overflow-the-phone-screen",
      ]),
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

async function assertNativeDateControlContained(page, selector, label) {
  const result = await page.locator(selector).evaluate((input) => {
    const owner = input.closest("[data-native-date-control]");
    if (!owner) {
      return { hasOwner: false };
    }

    const inputRect = input.getBoundingClientRect();
    const ownerRect = owner.getBoundingClientRect();
    const inputStyles = window.getComputedStyle(input);
    const ownerStyles = window.getComputedStyle(owner);
    const display = owner.querySelector('[data-testid$="-display"]');

    return {
      displayIsPresent: display instanceof HTMLElement,
      hasOwner: true,
      inputBoxSizing: inputStyles.boxSizing,
      inputWithinOwner: inputRect.left >= ownerRect.left - 1 && inputRect.right <= ownerRect.right + 1,
      nativeInputOpacity: inputStyles.opacity,
      ownerOverflowX: ownerStyles.overflowX,
      ownerPosition: ownerStyles.position,
    };
  });

  if (
    !result.hasOwner ||
    !result.displayIsPresent ||
    result.inputBoxSizing !== "border-box" ||
    !result.inputWithinOwner ||
    result.nativeInputOpacity !== "0" ||
    result.ownerOverflowX !== "hidden" ||
    result.ownerPosition !== "relative"
  ) {
    throw new Error(`${label}: date field must render its own bounded visual surface and keep the native picker input transparent within it: ${JSON.stringify(result)}.`);
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

  const requiredTop = Math.max(insets.safeTop, TELEGRAM_HOST_CONTROLS_MIN_TOP_PX);
  if (!box || !Number.isFinite(insets.safeTop) || box.y < requiredTop) {
    throw new Error(
      `${label}: ${selector} is inside the Telegram service-control inset (${JSON.stringify({ box, requiredTop, ...insets })}).`,
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
    await assertBelowTelegramTopInset(page, ".mt-balance-card", "transactions primary page");
    const mobileEditLabelCount = await page.locator('[data-testid="tx-mobile-row-9001"]').getByText("Edit", { exact: true }).count();
    const amountIntegrity = await page.locator('[data-testid="tx-mobile-amount-9001"]').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        whiteSpace: styles.whiteSpace,
      };
    });
    const uncategorizedControl = page.locator('[data-testid="tx-mobile-category-9003"]');
    if (
      mobileEditLabelCount !== 0 ||
      amountIntegrity.whiteSpace !== "nowrap" ||
      amountIntegrity.scrollWidth > amountIntegrity.clientWidth ||
      (await uncategorizedControl.textContent())?.trim() !== "?" ||
      (await uncategorizedControl.getAttribute("aria-label")) !== "Choose category for transaction 9003"
    ) {
      throw new Error(
        `Transaction card affordances regressed: ${JSON.stringify({ mobileEditLabelCount, amountIntegrity, uncategorizedLabel: await uncategorizedControl.getAttribute("aria-label"), uncategorizedText: await uncategorizedControl.textContent() })}.`,
      );
    }
    await screenshot(page, profileDirectory, "transactions");

    await page.click('[data-testid="transactions-filters-toggle"]');
    await assertNativeDateControlContained(page, "#transactions-from-date", "transactions from-date control");
    await assertNativeDateControlContained(page, "#transactions-to-date", "transactions to-date control");
    if ((await page.locator('[data-testid^="tx-filter-suggested-tag-"]').count()) !== 5) {
      throw new Error("Transactions filter must render exactly five suggested tags from a large catalogue.");
    }
    await page.click('[data-testid="tx-filter-edit-tags"]');
    await page.waitForSelector('[data-testid="tx-tags-page"]', { timeout: 15000 });
    await page.fill('[data-testid="tx-tags-search"]', "very-long-system-generated-filter-tag");
    await assertNoHorizontalOverflow(page, "filter tag selector");
    if ((await page.locator('[data-testid="tx-tags-add-from-search"]').count()) !== 0) {
      throw new Error("Transaction filter tag selector must not create unknown tags.");
    }
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-tags-page"]', { state: "hidden", timeout: 15000 });

    await page.click('[data-testid="tx-mobile-category-9001"]');
    await page.waitForSelector('[data-testid="tx-category-page"]', { timeout: 15000 });
    if (await page.locator('[data-testid="app-shell-nav"]').count()) {
      throw new Error("Nested full-page routes must use Telegram BackButton instead of the primary navigation.");
    }
    await assertBelowTelegramTopInset(page, '[data-testid="tx-category-search"]', "category selector");
    await assertNoHorizontalOverflow(page, "category selector");
    await assertScrollable(page, '[data-testid="tx-category-scroll"]', "category selector");
    await assertWithinViewport(page, '[data-testid="tx-category-update"]', "category selector action");
    if (
      (await page.locator('[data-testid="tx-category-expand-401"]').count()) !== 0 ||
      (await page.locator('[data-testid="tx-category-selection-marker-401"]').count()) !== 1
    ) {
      throw new Error("Leaf category must not render an expand chevron and must retain its selected marker.");
    }
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
    await assertNativeDateControlContained(page, "#analytics-from-date", "analytics from-date control");
    await assertNativeDateControlContained(page, "#analytics-to-date", "analytics to-date control");
    await assertBelowTelegramTopInset(page, '[data-testid="analytics-page"] > div:first-child', "analytics primary page");
    const analyticsOverview = await page.evaluate(() => {
      const metrics = (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          return null;
        }
        return {
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        };
      };
      const dateRange = document.querySelector('[data-testid="analytics-date-range-card"]');
      const dateInputs = [...document.querySelectorAll('[data-testid="analytics-from-date"], [data-testid="analytics-to-date"]')];
      const presets = document.querySelector('[data-testid="analytics-date-presets"]');
      const summary = document.querySelector('[data-testid="analytics-summary-card"]');
      const summaryContent = document.querySelector('[data-testid="analytics-summary-content"]');
      const trends = document.querySelector('[data-testid="analytics-trends-card"]');
      const trendsContent = document.querySelector('[data-testid="analytics-trends-content"]');
      const dateRangeRect = dateRange?.getBoundingClientRect();

      return {
        categories: metrics('[data-testid="analytics-category-list"]'),
        dateInputsContained: Boolean(dateRangeRect) && dateInputs.every((input) => {
          const rect = input.getBoundingClientRect();
          return rect.left >= dateRangeRect.left - 1 && rect.right <= dateRangeRect.right + 1;
        }),
        presetScrollbarWidth: presets ? window.getComputedStyle(presets).scrollbarWidth : null,
        summaryContentHeight: summaryContent?.getBoundingClientRect().height ?? 0,
        summaryMinHeight: summary ? window.getComputedStyle(summary).minHeight : null,
        tags: metrics('[data-testid="analytics-tag-list"]'),
        trendsContentHeight: trendsContent?.getBoundingClientRect().height ?? 0,
        trendsMinHeight: trends ? window.getComputedStyle(trends).minHeight : null,
      };
    });
    if (
      analyticsOverview.categories?.scrollHeight !== analyticsOverview.categories?.clientHeight ||
      analyticsOverview.tags?.scrollHeight !== analyticsOverview.tags?.clientHeight ||
      !analyticsOverview.dateInputsContained ||
      analyticsOverview.presetScrollbarWidth !== "none" ||
      analyticsOverview.summaryContentHeight <= 0 ||
      analyticsOverview.summaryMinHeight !== "auto" ||
      analyticsOverview.trendsContentHeight <= 0 ||
      analyticsOverview.trendsMinHeight !== "auto" ||
      (await page.locator('[data-testid="analytics-trend-summary"]').count()) !== 1 ||
      (await page.locator('[data-testid^="analytics-trend-item-"][aria-pressed="true"]').count()) !== 1
    ) {
      throw new Error(`Analytics overview containment regressed: ${JSON.stringify(analyticsOverview)}.`);
    }
    await screenshot(page, profileDirectory, "analytics");

    await page.click('[data-testid^="analytics-category-item-"]');
    await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
    if (await page.locator('[data-testid="app-shell-nav"]').count()) {
      throw new Error("Analytics drilldown must hide primary navigation while Telegram BackButton is active.");
    }
    await screenshot(page, profileDirectory, "analytics-drilldown");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { state: "hidden", timeout: 15000 });

    await page.click('[data-testid="analytics-category-view-all"]');
    await page.waitForSelector('[data-testid="analytics-category-breakdown-page"]', { timeout: 15000 });
    await assertNoHorizontalOverflow(page, "analytics category breakdown");
    await screenshot(page, profileDirectory, "analytics-category-breakdown");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="analytics-category-breakdown-page"]', { state: "hidden", timeout: 15000 });

    await page.click('[data-testid="analytics-tag-view-all"]');
    await page.waitForSelector('[data-testid="analytics-tag-breakdown-page"]', { timeout: 15000 });
    await assertNoHorizontalOverflow(page, "analytics tag breakdown");
    await screenshot(page, profileDirectory, "analytics-tag-breakdown-list");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="analytics-tag-breakdown-page"]', { state: "hidden", timeout: 15000 });

    await page.click('[data-testid="analytics-tag-item-commute"]');
    await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
    if (
      (await page.locator('[data-testid="analytics-drilldown-label"]').textContent())?.trim() !== "Spendings by Tag" ||
      (await page.locator('[data-testid^="analytics-drilldown-transaction-category-"]').count()) === 0
    ) {
      throw new Error("Tag drilldown must use the shared category-aware transaction row.");
    }
    await assertNoHorizontalOverflow(page, "analytics tag drilldown");
    await screenshot(page, profileDirectory, "analytics-tag-drilldown");
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { state: "hidden", timeout: 15000 });

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

    await page.goto(`${frontendBaseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="settings-page"]', { timeout: 30000 });
    await assertBelowTelegramTopInset(page, '[data-testid="settings-page"]', "settings primary page");
    await screenshot(page, profileDirectory, "settings");

    await page.goto(`${frontendBaseUrl}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ai-chat-page"]', { timeout: 30000 });
    await assertBelowTelegramTopInset(page, '[data-testid="ai-chat-page"]', "AI Chat primary page");
    await screenshot(page, profileDirectory, "ai-chat");

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
