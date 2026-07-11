import { fail, pass } from "./scaffold-utils.mjs";

const PHASE5_FR_IDS = ["FR-028", "FR-030", "FR-031", "FR-033", "FR-040"];

function normalizeToTestIdSegment(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function buildTransactionsResponse() {
  const createdAt = new Date().toISOString();

  return {
    data: [
      {
        id: 98501,
        userId: 1,
        transactionDate: createdAt,
        amount: -45.6,
        note: "phase5-transport-check",
        categoryId: 78501,
        tags: ["phase5backendtag", "phase5shared"],
        currency: "AED",
        smsText: null,
        messageId: null,
        createdAt,
        category: {
          id: 78501,
          name: "Transport",
          type: "EXPENSE",
          color: "#3b82f6",
          icon: "directions_car",
          parentCategoryId: null,
          orderIndex: 1,
          createdAt,
        },
      },
    ],
    totalCount: 1,
    skip: 0,
    take: 50,
    hasMore: false,
  };
}

export const phase5Definition = {
  id: "phase5",
  frIds: PHASE5_FR_IDS,
  async run({ page, frontendBaseUrl, backendBaseUrl }) {
    const fr = {};
    const transactionsRequestHeaders = [];
    let tagsRequestCount = 0;
    const transactionLayout = (page.viewportSize()?.width ?? 390) < 768 ? "mobile" : "desktop";

    await page.route(`${backendBaseUrl}/api/categories`, async (route) => {
      const createdAt = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 78501,
            name: "Transport",
            type: "EXPENSE",
            color: "#3b82f6",
            icon: "directions_car",
            parentCategoryId: null,
            orderIndex: 1,
            createdAt,
          },
        ]),
      });
    });

    await page.route(`${backendBaseUrl}/api/tags`, async (route) => {
      tagsRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(["phase5backendtag", "phase5shared", "phase5rare"]),
      });
    });

    await page.route(`${backendBaseUrl}/api/transactions*`, async (route) => {
      transactionsRequestHeaders.push(route.request().headers());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildTransactionsResponse()),
      });
    });

    await page.goto(`${frontendBaseUrl}/transactions`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(`[data-testid="tx-${transactionLayout}-row-98501"]`, { timeout: 30000 });

    const telegramHeaderIncluded = transactionsRequestHeaders.some((headers) =>
      Object.prototype.hasOwnProperty.call(headers, "x-telegram-init-data"),
    );

    fr["FR-028"] = telegramHeaderIncluded
      ? pass("Transactions API requests include X-Telegram-Init-Data header.")
      : fail("Did not capture X-Telegram-Init-Data header on transactions requests.");

    await page.click('button[aria-label="Show filters"]');
    await page.waitForSelector(
      `[data-testid="tx-filter-tag-option-${normalizeToTestIdSegment("phase5backendtag")}"]`,
      { timeout: 15000 },
    );

    await page.click(`[data-testid="tx-${transactionLayout}-tags-98501"]`);
    await page.waitForSelector('[data-testid="tx-tags-dialog"]', { timeout: 15000 });
    const tagInSelectorVisible = await page
      .locator(`[data-testid="tx-tag-option-${normalizeToTestIdSegment("phase5backendtag")}"]`)
      .isVisible()
      .catch(() => false);
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-testid="tx-tags-dialog"]', { state: "hidden", timeout: 15000 });

    const tagInFiltersVisible = await page
      .locator(`[data-testid="tx-filter-tag-option-${normalizeToTestIdSegment("phase5backendtag")}"]`)
      .isVisible()
      .catch(() => false);

    fr["FR-030"] =
      tagsRequestCount > 0 && tagInFiltersVisible && tagInSelectorVisible
        ? pass("Tag options are loaded from /api/tags and reused in filters and edit selector.")
        : fail(
            `Tag integration check failed (tagsRequestCount=${tagsRequestCount}, filterTagVisible=${tagInFiltersVisible}, selectorTagVisible=${tagInSelectorVisible}).`,
          );

    const navLabels = await page.locator('[data-testid^="app-shell-nav-link-"]').allTextContents();
    const navCount = navLabels.length;
    const hasApprovedNavOnly =
      navCount === 4 &&
      ["Transactions", "Analytics", "AI Chat", "Settings"].every((label) => navLabels.includes(label));

    fr["FR-040"] = hasApprovedNavOnly
      ? pass("Navigation scope is limited to approved tabs: Transactions, Analytics, AI Chat, Settings.")
      : fail(`Unexpected navigation scope detected (count=${navCount}, labels=${navLabels.join(", ")}).`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${frontendBaseUrl}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ai-chat-send"]', { timeout: 30000 });
    await page.locator('[data-testid="ai-chat-send"]').scrollIntoViewIfNeeded();

    const shellStyle = await page.locator('[data-testid="app-shell-root"]').getAttribute("style");
    const usesStableViewportVar = shellStyle?.includes("--mt-viewport-stable-height") ?? false;

    const navPaddingBottom = await page.locator('[data-testid="app-shell-nav-inner"]').evaluate((element) => {
      return Number.parseFloat(window.getComputedStyle(element).paddingBottom || "0");
    });

    const sendBounds = await page.locator('[data-testid="ai-chat-send"]').boundingBox();
    const navBounds = await page.locator('[data-testid="app-shell-nav"]').boundingBox();
    const sendControlReachable =
      sendBounds !== null && navBounds !== null ? sendBounds.y + sendBounds.height <= navBounds.y : false;

    fr["FR-033"] =
      usesStableViewportVar && navPaddingBottom > 0 && sendControlReachable
        ? pass("Critical controls remain reachable with mobile viewport and safe-area-aware shell layout.")
        : fail(
            `Viewport reachability check failed (stableVar=${usesStableViewportVar}, navPaddingBottom=${navPaddingBottom}, sendReachable=${sendControlReachable}).`,
          );

    await page.unroute(`${backendBaseUrl}/api/transactions*`);
    await page.route(`${backendBaseUrl}/api/transactions*`, async (route) => {
      await route.abort("internetdisconnected");
    });

    await page.goto(`${frontendBaseUrl}/transactions?phase5-fallback=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector('[data-testid="app-shell-fallback-mode"]', { timeout: 30000 });

    const fallbackBannerVisible = await page.locator('[data-testid="app-shell-fallback-mode"]').isVisible();
    const renderedFallbackRows = await page.locator(`[data-testid^="tx-${transactionLayout}-row-"]`).count();

    fr["FR-031"] =
      fallbackBannerVisible && renderedFallbackRows > 0
        ? pass("When backend is unreachable in QA/dev, app switches to controlled fallback data mode.")
        : fail(
            `Fallback mode behavior failed (bannerVisible=${fallbackBannerVisible}, renderedRows=${renderedFallbackRows}).`,
          );

    return {
      fr,
      artifacts: {
        tagsRequestCount,
        telegramHeaderIncluded,
      },
    };
  },
};
