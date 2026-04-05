import { fail, pass } from "./scaffold-utils.mjs";

const PHASE3_FR_IDS = ["FR-018", "FR-019", "FR-020", "FR-021", "FR-022"];

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toTestIdSegment(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 64);
}

async function createQaTransaction(backendBaseUrl, payload) {
  const response = await fetch(`${backendBaseUrl}/api/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Failed to create QA transaction (${response.status}): ${details}`);
  }

  return await response.json();
}

async function deleteQaTransaction(backendBaseUrl, transactionId) {
  const response = await fetch(`${backendBaseUrl}/api/transactions/${transactionId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    throw new Error(`Failed to delete QA transaction ${transactionId} (${response.status}): ${details}`);
  }
}

async function readSummaryCount(page) {
  const summaryText = await page.locator('[data-testid="analytics-summary-count"]').textContent();
  const match = summaryText?.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export const phase3Definition = {
  id: "phase3",
  frIds: PHASE3_FR_IDS,
  async run({ page, backendBaseUrl, frontendBaseUrl }) {
    const fr = {};
    const runId = `__qa_phase3_${Date.now()}__`;

    const now = new Date();
    const oldDate = new Date(now);
    oldDate.setDate(now.getDate() - 45);

    const todayDate = formatDateOnly(now);
    const oldRangeDate = formatDateOnly(oldDate);
    const oldMonthKey = formatMonthOnly(oldDate);
    const oldTag = `${runId}_old_tag`;

    const created = await Promise.all([
      createQaTransaction(backendBaseUrl, {
        transactionDate: new Date(now.setHours(11, 10, 0, 0)).toISOString(),
        amount: -41.5,
        note: `${runId}_expense_recent`,
        categoryId: null,
        tags: [`${runId}_recent_tag`],
        currency: "AED",
      }),
      createQaTransaction(backendBaseUrl, {
        transactionDate: new Date().toISOString(),
        amount: 180,
        note: `${runId}_income_recent`,
        categoryId: null,
        tags: [],
        currency: "AED",
      }),
      createQaTransaction(backendBaseUrl, {
        transactionDate: new Date(oldDate.setHours(17, 30, 0, 0)).toISOString(),
        amount: -64.9,
        note: `${runId}_expense_old`,
        categoryId: null,
        tags: [oldTag],
        currency: "AED",
      }),
    ]);

    try {
      let delayedFirstRequest = true;
      await page.route("**/api/transactions*", async (route) => {
        if (delayedFirstRequest) {
          delayedFirstRequest = false;
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        await route.continue();
      });

      await page.goto(`${frontendBaseUrl}/analytics`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('[data-testid="analytics-from-date"]', { timeout: 30000 });
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.unroute("**/api/transactions*");

      let loadingVisible = false;

      const summaryVisible = await page.locator('[data-testid="analytics-summary-card"]').isVisible();
      const categoriesVisible = await page.locator('[data-testid="analytics-category-card"]').isVisible();
      const tagsVisible = await page.locator('[data-testid="analytics-tags-card"]').isVisible();
      const trendsVisible = await page.locator('[data-testid="analytics-trends-card"]').isVisible();

      fr["FR-019"] =
        summaryVisible && categoriesVisible && tagsVisible && trendsVisible
          ? pass("Analytics renders summary, category spend, tag spend, and monthly trend widgets.")
          : fail("One or more required analytics widgets are missing.");

      await page.fill('[data-testid="analytics-from-date"]', oldRangeDate);
      await page.fill('[data-testid="analytics-to-date"]', todayDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);

      const wideSummaryCount = await readSummaryCount(page);

      await page.fill('[data-testid="analytics-from-date"]', todayDate);
      await page.fill('[data-testid="analytics-to-date"]', todayDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);

      const narrowSummaryCount = await readSummaryCount(page);

      fr["FR-018"] =
        wideSummaryCount !== null &&
        narrowSummaryCount !== null &&
        wideSummaryCount > narrowSummaryCount
          ? pass(
              `Date range constrains analytics: count changed from ${wideSummaryCount} to ${narrowSummaryCount}.`,
            )
          : fail(
              `Expected date-range constrained analytics counts to differ (wide=${wideSummaryCount}, narrow=${narrowSummaryCount}).`,
            );

      const oldTagSegment = toTestIdSegment(oldTag);

      await page.fill('[data-testid="analytics-from-date"]', oldRangeDate);
      await page.fill('[data-testid="analytics-to-date"]', todayDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);

      const oldTagVisibleWide = await page
        .locator(`[data-testid="analytics-tag-item-${oldTagSegment}"]`)
        .isVisible()
        .catch(() => false);
      const oldMonthVisibleWide = await page
        .locator(`[data-testid="analytics-trend-item-${oldMonthKey}"]`)
        .isVisible()
        .catch(() => false);
      const wideCategoryAmount = (
        await page
          .locator('[data-testid="analytics-category-amount-uncategorized"]')
          .first()
          .textContent()
          .catch(() => "")
      )?.trim();

      await page.fill('[data-testid="analytics-from-date"]', todayDate);
      await page.fill('[data-testid="analytics-to-date"]', todayDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);

      const oldTagVisibleNarrow = await page
        .locator(`[data-testid="analytics-tag-item-${oldTagSegment}"]`)
        .isVisible()
        .catch(() => false);
      const oldMonthVisibleNarrow = await page
        .locator(`[data-testid="analytics-trend-item-${oldMonthKey}"]`)
        .isVisible()
        .catch(() => false);
      const narrowCategoryAmount = (
        await page
          .locator('[data-testid="analytics-category-amount-uncategorized"]')
          .first()
          .textContent()
          .catch(() => "")
      )?.trim();

      fr["FR-021"] =
        oldTagVisibleWide &&
        !oldTagVisibleNarrow &&
        oldMonthVisibleWide &&
        !oldMonthVisibleNarrow &&
        wideCategoryAmount !== narrowCategoryAmount
          ? pass("Date-range updates recompute tags, trends, and category totals consistently.")
          : fail(
              `Expected consistent widget recompute. tagWide=${oldTagVisibleWide}, tagNarrow=${oldTagVisibleNarrow}, monthWide=${oldMonthVisibleWide}, monthNarrow=${oldMonthVisibleNarrow}, categoryWide=${wideCategoryAmount}, categoryNarrow=${narrowCategoryAmount}.`,
            );

      let delayedLoadingProbe = true;
      await page.route("**/api/transactions*", async (route) => {
        if (delayedLoadingProbe) {
          delayedLoadingProbe = false;
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
        await route.continue();
      });

      await page.click('[data-testid="analytics-preset-last-7-days"]');
      loadingVisible = await page
        .waitForSelector('[data-testid="analytics-loading"]', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.unroute("**/api/transactions*");

      const future = new Date();
      future.setDate(future.getDate() + 3650);
      const futureDate = formatDateOnly(future);

      await page.fill('[data-testid="analytics-from-date"]', futureDate);
      await page.fill('[data-testid="analytics-to-date"]', futureDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);
      const noDataVisible = await page.locator('[data-testid="analytics-no-data"]').isVisible().catch(() => false);

      let forceFailure = true;
      await page.route("**/api/transactions*", async (route) => {
        if (forceFailure) {
          forceFailure = false;
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ detail: "qa forced failure" }),
          });
          return;
        }
        await route.continue();
      });

      await page.click('[data-testid="analytics-preset-current-month"]');
      await page.waitForSelector('[data-testid="analytics-error"]', { timeout: 30000 });
      const errorVisible = await page.locator('[data-testid="analytics-error"]').isVisible().catch(() => false);
      const retryVisible = await page.locator('[data-testid="analytics-retry"]').isVisible().catch(() => false);

      await page.unroute("**/api/transactions*");
      await page.click('[data-testid="analytics-retry"]');
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      const recoveredAfterRetry = await page.locator('[data-testid="analytics-summary-card"]').isVisible();

      fr["FR-020"] =
        loadingVisible && noDataVisible && errorVisible && retryVisible && recoveredAfterRetry
          ? pass("Analytics exposes loading, no-data, and error-with-retry states.")
          : fail(
              `State coverage failed (loading=${loadingVisible}, noData=${noDataVisible}, error=${errorVisible}, retry=${retryVisible}, recovered=${recoveredAfterRetry}).`,
            );

      await page.fill('[data-testid="analytics-from-date"]', oldRangeDate);
      await page.fill('[data-testid="analytics-to-date"]', todayDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });

      const fromBeforeDrilldown = await page.inputValue('[data-testid="analytics-from-date"]');
      const categoryButton = page.locator('[data-testid^="analytics-category-item-"]').first();
      await categoryButton.click();
      await page.waitForSelector('[data-testid="analytics-drilldown-dialog"]', { timeout: 15000 });
      const drilldownVisible = await page.locator('[data-testid="analytics-drilldown-dialog"]').isVisible();
      const drilldownCloseVisible = await page
        .locator('[data-testid="analytics-drilldown-close"]')
        .isVisible()
        .catch(() => false);
      const drilldownListCount = await page.locator('[data-testid^="analytics-drilldown-item-"]').count();

      await page.click('[data-testid="analytics-drilldown-close"]');
      await page.waitForSelector('[data-testid="analytics-drilldown-dialog"]', {
        state: "hidden",
        timeout: 15000,
      });

      const fromAfterDrilldown = await page.inputValue('[data-testid="analytics-from-date"]');
      const contextPreserved = fromBeforeDrilldown === fromAfterDrilldown;

      fr["FR-022"] =
        drilldownVisible && drilldownCloseVisible && drilldownListCount > 0 && contextPreserved
          ? pass("Category drilldown opens as popup/list, closes explicitly, and preserves analytics context.")
          : fail(
              `Drilldown behavior failed (open=${drilldownVisible}, closeVisible=${drilldownCloseVisible}, listCount=${drilldownListCount}, contextPreserved=${contextPreserved}).`,
            );

      return {
        fr,
        artifacts: {
          createdTransactionIds: created.map((transaction) => transaction.id),
          runId,
        },
      };
    } finally {
      await Promise.all(
        created.map((transaction) =>
          deleteQaTransaction(backendBaseUrl, transaction.id).catch(() => undefined),
        ),
      );
    }
  },
};
