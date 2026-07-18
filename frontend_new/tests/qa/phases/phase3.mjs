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

async function readCategories(backendBaseUrl) {
  const response = await fetch(`${backendBaseUrl}/api/categories`);
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Failed to read QA categories (${response.status}): ${details}`);
  }

  const categories = await response.json();
  if (!Array.isArray(categories) || categories.length < 6) {
    throw new Error(`Phase-3 QA requires at least six categories, received ${JSON.stringify(categories)}.`);
  }

  return categories.slice(0, 6);
}

async function continueRoute(route) {
  try {
    await route.continue();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route is already handled")) {
      return;
    }

    throw error;
  }
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
    const previewCategories = await readCategories(backendBaseUrl);
    const previewTagPrefix = `${runId}_preview_tag`;

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
        amount: -99999,
        note: `${runId}_expense_old`,
        categoryId: null,
        tags: [oldTag],
        currency: "AED",
      }),
      ...previewCategories.map((category, index) =>
        createQaTransaction(backendBaseUrl, {
          transactionDate: new Date().toISOString(),
          amount: -(12 + index),
          note: `${runId}_category_preview_${index + 1}`,
          categoryId: category.id,
          tags: [`${previewTagPrefix}_${index + 1}`],
          currency: "AED",
        }),
      ),
    ]);

    try {
      let delayedFirstRequest = true;
      const backendOrigin = new URL(backendBaseUrl).origin;
      const transactionsApiMatcher = (url) =>
        url.origin === backendOrigin && url.pathname.startsWith("/api/transactions");
      await page.route(transactionsApiMatcher, async (route) => {
        if (route.request().method() !== "GET") {
          await continueRoute(route);
          return;
        }

        if (delayedFirstRequest) {
          delayedFirstRequest = false;
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        await continueRoute(route);
      });

      await page.goto(`${frontendBaseUrl}/analytics`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('[data-testid="analytics-from-date"]', { timeout: 30000 });
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.unroute(transactionsApiMatcher);

      let loadingVisible = false;

      const summaryVisible = await page.locator('[data-testid="analytics-summary-card"]').isVisible();
      const categoriesVisible = await page.locator('[data-testid="analytics-category-card"]').isVisible();
      const tagsVisible = await page.locator('[data-testid="analytics-tags-card"]').isVisible();
      const trendsVisible = await page.locator('[data-testid="analytics-trends-card"]').isVisible();

      const overviewContainment = await page.evaluate(() => {
        const getMetrics = (selector) => {
          const element = document.querySelector(selector);
          if (!element) {
            return null;
          }
          const styles = window.getComputedStyle(element);
          return {
            clientHeight: element.clientHeight,
            overflowY: styles.overflowY,
            scrollHeight: element.scrollHeight,
          };
        };

        const dateRange = document.querySelector('[data-testid="analytics-date-range-card"]');
        const dateInputs = [...document.querySelectorAll('[data-testid="analytics-from-date"], [data-testid="analytics-to-date"]')];
        const summary = document.querySelector('[data-testid="analytics-summary-card"]');
        const summaryContent = document.querySelector('[data-testid="analytics-summary-content"]');
        const trends = document.querySelector('[data-testid="analytics-trends-card"]');
        const trendsContent = document.querySelector('[data-testid="analytics-trends-content"]');
        const presets = document.querySelector('[data-testid="analytics-date-presets"]');
        const dateRangeRect = dateRange?.getBoundingClientRect();

        return {
          categories: getMetrics('[data-testid="analytics-category-list"]'),
          dateInputsContained: Boolean(dateRangeRect) && dateInputs.every((input) => {
            const rect = input.getBoundingClientRect();
            return rect.left >= dateRangeRect.left - 1 && rect.right <= dateRangeRect.right + 1;
          }),
          presetScrollbarWidth: presets ? window.getComputedStyle(presets).scrollbarWidth : null,
          summaryContentHeight: summaryContent?.getBoundingClientRect().height ?? 0,
          summaryMinHeight: summary ? window.getComputedStyle(summary).minHeight : null,
          tags: getMetrics('[data-testid="analytics-tag-list"]'),
          trendsContentHeight: trendsContent?.getBoundingClientRect().height ?? 0,
          trendsMinHeight: trends ? window.getComputedStyle(trends).minHeight : null,
        };
      });

      fr["FR-019"] =
        summaryVisible &&
        categoriesVisible &&
        tagsVisible &&
        trendsVisible &&
        overviewContainment.categories?.scrollHeight === overviewContainment.categories?.clientHeight &&
        overviewContainment.tags?.scrollHeight === overviewContainment.tags?.clientHeight &&
        overviewContainment.dateInputsContained &&
        overviewContainment.presetScrollbarWidth === "none" &&
        overviewContainment.summaryContentHeight > 0 &&
        overviewContainment.summaryMinHeight === "auto" &&
        overviewContainment.trendsContentHeight > 0 &&
        overviewContainment.trendsMinHeight === "auto"
          ? pass("Analytics renders contained overview widgets with hidden preset scrollbar and non-collapsed summary/trend bodies.")
          : fail(`Analytics overview containment failed: ${JSON.stringify(overviewContainment)}.`);

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

      const categoryPreviewCount = await page.locator('[data-testid^="analytics-category-item-"]').count();
      const tagPreviewCount = await page.locator('[data-testid^="analytics-tag-item-"]').count();
      const fromBeforeBreakdowns = await page.inputValue('[data-testid="analytics-from-date"]');

      await page.click('[data-testid="analytics-category-view-all"]');
      await page.waitForSelector('[data-testid="analytics-category-breakdown-page"]', { timeout: 15000 });
      const categoryBreakdownCount = await page.locator('[data-testid^="analytics-breakdown-item-category-"]').count();
      await page.evaluate(() => window.__qaTelegram.pressBack());
      await page.waitForSelector('[data-testid="analytics-category-breakdown-page"]', { state: "hidden", timeout: 15000 });

      await page.click('[data-testid="analytics-tag-view-all"]');
      await page.waitForSelector('[data-testid="analytics-tag-breakdown-page"]', { timeout: 15000 });
      const tagBreakdownCount = await page.locator('[data-testid^="analytics-breakdown-item-tag-"]').count();
      await page.evaluate(() => window.__qaTelegram.pressBack());
      await page.waitForSelector('[data-testid="analytics-tag-breakdown-page"]', { state: "hidden", timeout: 15000 });
      const fromAfterBreakdowns = await page.inputValue('[data-testid="analytics-from-date"]');

      if (
        categoryPreviewCount !== 5 ||
        tagPreviewCount !== 5 ||
        categoryBreakdownCount <= categoryPreviewCount ||
        tagBreakdownCount <= tagPreviewCount ||
        fromBeforeBreakdowns !== fromAfterBreakdowns
      ) {
        throw new Error(
          `Analytics View all behavior failed: ${JSON.stringify({ categoryPreviewCount, tagPreviewCount, categoryBreakdownCount, tagBreakdownCount, fromBeforeBreakdowns, fromAfterBreakdowns })}.`,
        );
      }

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
      await page.click(`[data-testid="analytics-trend-item-${oldMonthKey}"]`);
      const oldTrendSelected =
        (await page.locator(`[data-testid="analytics-trend-item-${oldMonthKey}"]`).getAttribute("aria-pressed")) === "true";
      const oldTrendSummaryMonth = await page.locator('[data-testid="analytics-trend-summary-month"]').textContent();
      const oldTrendSummaryValuesVisible = await Promise.all([
        page.locator('[data-testid="analytics-trend-summary-income"]').isVisible(),
        page.locator('[data-testid="analytics-trend-summary-expense"]').isVisible(),
      ]).then((checks) => checks.every(Boolean));

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
      const selectedVisibleTrendCount = await page.locator('[data-testid^="analytics-trend-item-"][aria-pressed="true"]').count();
      const narrowTrendSummaryMonth = await page.locator('[data-testid="analytics-trend-summary-month"]').textContent();

      fr["FR-021"] =
        oldTagVisibleWide &&
        !oldTagVisibleNarrow &&
        oldMonthVisibleWide &&
        !oldMonthVisibleNarrow &&
        wideCategoryAmount !== narrowCategoryAmount
          &&
        oldTrendSelected &&
        oldTrendSummaryMonth?.trim() !== "" &&
        oldTrendSummaryValuesVisible &&
        selectedVisibleTrendCount === 1 &&
        narrowTrendSummaryMonth !== oldTrendSummaryMonth
          ? pass("Date-range updates recompute tags, trends, category totals, and selected-month disclosure consistently.")
          : fail(
              `Expected consistent widget recompute. tagWide=${oldTagVisibleWide}, tagNarrow=${oldTagVisibleNarrow}, monthWide=${oldMonthVisibleWide}, monthNarrow=${oldMonthVisibleNarrow}, categoryWide=${wideCategoryAmount}, categoryNarrow=${narrowCategoryAmount}, oldTrendSelected=${oldTrendSelected}, oldTrendSummaryMonth=${oldTrendSummaryMonth}, oldTrendSummaryValuesVisible=${oldTrendSummaryValuesVisible}, selectedVisibleTrendCount=${selectedVisibleTrendCount}, narrowTrendSummaryMonth=${narrowTrendSummaryMonth}.`,
          );

      let delayedLoadingProbe = true;
      await page.route(transactionsApiMatcher, async (route) => {
        if (route.request().method() !== "GET") {
          await continueRoute(route);
          return;
        }

        if (delayedLoadingProbe) {
          delayedLoadingProbe = false;
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
        await continueRoute(route);
      });

      await page.click('[data-testid="analytics-preset-last-7-days"]');
      loadingVisible = await page
        .waitForSelector('[data-testid="analytics-loading"]', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.unroute(transactionsApiMatcher);

      const future = new Date();
      future.setDate(future.getDate() + 3650);
      const futureDate = formatDateOnly(future);

      await page.fill('[data-testid="analytics-from-date"]', futureDate);
      await page.fill('[data-testid="analytics-to-date"]', futureDate);
      await page.waitForSelector('[data-testid="analytics-summary-card"]', { timeout: 30000 });
      await page.waitForTimeout(500);
      const noDataVisible = await page.locator('[data-testid="analytics-no-data"]').isVisible().catch(() => false);

      await page.route(transactionsApiMatcher, async (route) => {
        if (route.request().method() !== "GET") {
          await continueRoute(route);
          return;
        }

        await route.fulfill({
          status: 500,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": frontendBaseUrl,
          },
          body: JSON.stringify({ detail: "qa forced failure" }),
        });
      });

      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('[data-testid="analytics-error"]', { timeout: 30000 });
      const errorVisible = await page.locator('[data-testid="analytics-error"]').isVisible().catch(() => false);
      const retryVisible = await page.locator('[data-testid="analytics-retry"]').isVisible().catch(() => false);

      await page.unroute(transactionsApiMatcher);
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
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
      const drilldownVisible = await page.locator('[data-testid="analytics-drilldown-page"]').isVisible();
      const hostBackListenerActive = await page.evaluate(
        () => window.__qaTelegram.getState().backButtonListenerCount === 1,
      );
      await page.locator('[data-testid^="analytics-drilldown-item-"]').first().waitFor({ timeout: 15000 });
      const drilldownListCount = await page.locator('[data-testid^="analytics-drilldown-item-"]').count();
      const drilldownVisualStructure = await Promise.all([
        page.locator('[data-testid="analytics-drilldown-icon"]').isVisible(),
        page.locator('[data-testid="analytics-drilldown-total"]').isVisible(),
        page.locator('[data-testid="analytics-drilldown-range"]').isVisible(),
        page.locator('[data-testid="analytics-drilldown-scroll"]').isVisible(),
      ]).then((checks) => checks.every(Boolean));
      const categoryRowAffordanceCount = await page.locator('[data-testid^="analytics-drilldown-transaction-category-"]').count();
      const categoryEditAction = page.locator('[data-testid^="analytics-drilldown-edit-"]').first();
      const categoryEditActionCount = await page.locator('[data-testid^="analytics-drilldown-edit-"]').count();
      const categoryTransactionId = (await categoryEditAction.getAttribute("data-testid"))?.replace(
        "analytics-drilldown-edit-",
        "",
      );

      await categoryEditAction.click();
      await page.waitForSelector('[data-testid="tx-edit-page"]', { timeout: 15000 });
      const editorTransactionId = await page.locator('[data-testid="tx-edit-page"]').getAttribute("data-transaction-id");
      const editorAmount = await page.locator("#transaction-edit-amount").inputValue();
      const editedNote = `${runId}_analytics_edit`;
      await page.fill("#transaction-edit-note", editedNote);
      await page.click('[data-testid="tx-edit-save"]');
      await page.waitForSelector('[data-testid="tx-edit-page"]', { state: "hidden", timeout: 15000 });
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
      const drilldownReturnedFromEditor = await page.locator('[data-testid="analytics-drilldown-page"]').isVisible();
      const editedRowVisible = await page
        .waitForFunction(
          ({ note, transactionId }) =>
            document.querySelector(`[data-testid="analytics-drilldown-item-${transactionId}"]`)?.textContent?.includes(note) ?? false,
          { note: editedNote, transactionId: categoryTransactionId },
          { timeout: 15000 },
        )
        .then(() => true)
        .catch(() => false);

      await page.click(`[data-testid="analytics-drilldown-edit-${categoryTransactionId}"]`);
      await page.waitForSelector('[data-testid="tx-edit-page"]', { timeout: 15000 });
      await page.click('[data-testid="tx-edit-delete-trigger"]');
      await page.waitForSelector('[data-testid="tx-edit-delete-confirm-dialog"]', { timeout: 15000 });
      await page.click('[data-testid="tx-edit-delete-confirm"]');
      await page.waitForSelector('[data-testid="tx-edit-page"]', { state: "hidden", timeout: 15000 });
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
      const deletedRowRemoved = await page
        .waitForFunction(
          (transactionId) => !document.querySelector(`[data-testid="analytics-drilldown-item-${transactionId}"]`),
          categoryTransactionId,
          { timeout: 15000 },
        )
        .then(() => true)
        .catch(() => false);

      await page.evaluate(() => window.__qaTelegram.pressBack());
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', {
        state: "hidden",
        timeout: 15000,
      });

      const fromAfterCategoryDrilldown = await page.inputValue('[data-testid="analytics-from-date"]');
      const tagButton = page.locator(`[data-testid="analytics-tag-item-${oldTagSegment}"]`);
      await tagButton.click();
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', { timeout: 15000 });
      const tagDrilldownVisible = await page.locator('[data-testid="analytics-drilldown-page"]').isVisible();
      const tagDrilldownLabel = await page.locator('[data-testid="analytics-drilldown-label"]').textContent();
      const tagDrilldownSubject = await page.locator('[data-testid="analytics-drilldown-subject"]').textContent();
      await page.locator('[data-testid^="analytics-drilldown-item-"]').first().waitFor({ timeout: 15000 });
      const tagDrilldownListCount = await page.locator('[data-testid^="analytics-drilldown-item-"]').count();
      const tagRowAffordanceCount = await page.locator('[data-testid^="analytics-drilldown-transaction-category-"]').count();

      await page.evaluate(() => window.__qaTelegram.pressBack());
      await page.waitForSelector('[data-testid="analytics-drilldown-page"]', {
        state: "hidden",
        timeout: 15000,
      });

      const fromAfterTagDrilldown = await page.inputValue('[data-testid="analytics-from-date"]');
      const contextPreserved =
        fromBeforeDrilldown === fromAfterCategoryDrilldown && fromBeforeDrilldown === fromAfterTagDrilldown;

      fr["FR-022"] =
        drilldownVisible &&
        hostBackListenerActive &&
        drilldownListCount > 0 &&
        drilldownVisualStructure &&
        categoryRowAffordanceCount === drilldownListCount &&
        categoryEditActionCount === drilldownListCount &&
        categoryTransactionId === editorTransactionId &&
        editorAmount !== "" &&
        drilldownReturnedFromEditor &&
        editedRowVisible &&
        deletedRowRemoved &&
        tagDrilldownVisible &&
        tagDrilldownLabel?.trim() === "Spendings by Tag" &&
        tagDrilldownSubject?.trim() === `#${oldTag}` &&
        tagDrilldownListCount > 0 &&
        tagRowAffordanceCount === tagDrilldownListCount &&
        contextPreserved
          ? pass("Category and tag drilldowns render category-aware editable rows, refresh after save/delete, and preserve Analytics context.")
          : fail(
              `Drilldown behavior failed (categoryOpen=${drilldownVisible}, hostBack=${hostBackListenerActive}, categoryListCount=${drilldownListCount}, categoryAffordances=${categoryRowAffordanceCount}, categoryEditActions=${categoryEditActionCount}, categoryTransactionId=${categoryTransactionId}, editorTransactionId=${editorTransactionId}, editorAmount=${editorAmount}, returnedFromEditor=${drilldownReturnedFromEditor}, editedRowVisible=${editedRowVisible}, deletedRowRemoved=${deletedRowRemoved}, structure=${drilldownVisualStructure}, tagOpen=${tagDrilldownVisible}, tagLabel=${tagDrilldownLabel}, tagSubject=${tagDrilldownSubject}, tagListCount=${tagDrilldownListCount}, tagAffordances=${tagRowAffordanceCount}, contextPreserved=${contextPreserved}).`,
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
