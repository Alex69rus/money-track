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
    const filterTagSelector = page.locator('[data-testid="tx-filter-open-tags"]');
    await filterTagSelector.waitFor({ state: "visible", timeout: 15000 });

    const tagEditor = page.locator(`[data-testid="tx-${transactionLayout}-tags-98501"]`);
    await tagEditor.scrollIntoViewIfNeeded();
    const [tagEditorBounds, primaryNavigationBounds] = await Promise.all([
      tagEditor.boundingBox(),
      page.locator('[data-testid="app-shell-nav"]').boundingBox(),
    ]);
    const tagEditorReachable =
      tagEditorBounds !== null &&
      primaryNavigationBounds !== null &&
      tagEditorBounds.y + tagEditorBounds.height <= primaryNavigationBounds.y;
    if (!tagEditorReachable) {
      const navigationDiagnostics = await page.evaluate(() => {
        const main = document.querySelector('[data-testid="app-shell-main"]');
        const row = document.querySelector('[data-testid="tx-mobile-row-98501"]');
        const section = main?.querySelector(":scope > section");
        const styles = main ? window.getComputedStyle(main) : null;
        const sectionStyles = section ? window.getComputedStyle(section) : null;

        return {
          main: main
            ? {
                clientHeight: main.clientHeight,
                rect: main.getBoundingClientRect().toJSON(),
                scrollHeight: main.scrollHeight,
                scrollPaddingBottom: styles?.scrollPaddingBottom ?? null,
                scrollTop: main.scrollTop,
              }
            : null,
          row: row?.getBoundingClientRect().toJSON() ?? null,
          section: section
            ? {
                className: section.className,
                paddingBottom: sectionStyles?.paddingBottom ?? null,
                rect: section.getBoundingClientRect().toJSON(),
              }
            : null,
        };
      });
      throw new Error(
        `Tag editor remains behind persistent navigation: ${JSON.stringify({ navigationDiagnostics, primaryNavigationBounds, tagEditorBounds })}.`,
      );
    }

    await tagEditor.click();
    await page.waitForSelector('[data-testid="tx-tags-page"]', { timeout: 15000 });
    const tagInSelectorVisible = await page
      .locator(`[data-testid="tx-tag-option-${normalizeToTestIdSegment("phase5backendtag")}"]`)
      .isVisible()
      .catch(() => false);
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-tags-page"]', { state: "hidden", timeout: 15000 });

    await filterTagSelector.click();
    await page.waitForSelector('[data-testid="tx-tags-page"]', { timeout: 15000 });
    const tagInFilterSelectorVisible = await page
      .locator(`[data-testid="tx-tag-option-${normalizeToTestIdSegment("phase5backendtag")}"]`)
      .isVisible()
      .catch(() => false);
    await page.evaluate(() => window.__qaTelegram.pressBack());
    await page.waitForSelector('[data-testid="tx-tags-page"]', { state: "hidden", timeout: 15000 });

    fr["FR-030"] =
      tagsRequestCount > 0 && tagInFilterSelectorVisible && tagInSelectorVisible
        ? pass("Tag options are loaded from /api/tags and reused in filters and edit selector.")
        : fail(
            `Tag integration check failed (tagsRequestCount=${tagsRequestCount}, filterTagSelectorVisible=${tagInFilterSelectorVisible}, selectorTagVisible=${tagInSelectorVisible}).`,
          );

    await page.goto(`${frontendBaseUrl}/transactions`, { waitUntil: "domcontentloaded", timeout: 120000 });
    const navDestinations = await page
      .locator('[data-testid^="app-shell-nav-link-"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("data-testid")?.replace("app-shell-nav-link-", "") ?? ""));
    const navCount = navDestinations.length;
    const hasApprovedNavOnly =
      navCount === 4 &&
      ["transactions", "analytics", "chat", "settings"].every((destination) => navDestinations.includes(destination));

    fr["FR-040"] = hasApprovedNavOnly
      ? pass("Telegram bottom navigation is limited to Transactions, Analytics, AI Chat, and Settings.")
      : fail(`Unexpected navigation scope detected (count=${navCount}, destinations=${navDestinations.join(", ")}).`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${frontendBaseUrl}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ai-chat-send"]', { timeout: 30000 });
    await page.locator('[data-testid="ai-chat-send"]').scrollIntoViewIfNeeded();

    const shellStyle = await page.locator('[data-testid="app-shell-root"]').getAttribute("style");
    const usesStableViewportVar = shellStyle?.includes("--mt-viewport-stable-height") ?? false;

    const sendBounds = await page.locator('[data-testid="ai-chat-send"]').boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const customNavigationCount = await page.locator('[data-testid="app-shell-nav"]').count();
    const navBounds = await page.locator('[data-testid="app-shell-nav"]').boundingBox();
    const sendControlReachable =
      sendBounds !== null && navBounds !== null
        ? sendBounds.y + sendBounds.height <= navBounds.y && navBounds.y + navBounds.height <= viewportHeight
        : false;

    fr["FR-033"] =
      usesStableViewportVar && customNavigationCount === 1 && sendControlReachable
        ? pass("Critical controls remain reachable above persistent Telegram bottom navigation.")
        : fail(
            `Viewport reachability check failed (stableVar=${usesStableViewportVar}, customNavigationCount=${customNavigationCount}, sendReachable=${sendControlReachable}).`,
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
