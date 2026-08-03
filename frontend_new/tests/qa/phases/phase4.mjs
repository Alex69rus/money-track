import { fail, pass } from "./scaffold-utils.mjs";
import { assessAiChatComposerNavigationGutter } from "../ai-chat-layout.mjs";

const PHASE4_FR_IDS = ["FR-023", "FR-024", "FR-025", "FR-026", "FR-027"];

function parseJsonSafely(value) {
  try {
    const parsed = JSON.parse(value ?? "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function chatResponse(message, visual = null) {
  return JSON.stringify({ version: "v1", kind: "answer", message, visual });
}

function twentyBarChart() {
  return {
    kind: "bar",
    title: "Spending by category",
    period: { fromDate: "2025-01-01", label: "2025 to 2026", toDate: "2026-12-31" },
    items: Array.from({ length: 20 }, (_, index) => ({
      label: `Category ${index + 1}`,
      values: [{ label: "Transaction count", value: { value: `${index + 1}.00`, display: `${index + 1} transactions` } }],
    })),
  };
}

function twentyFourPointLineChart() {
  return {
    kind: "line",
    title: "Balance growth",
    period: { fromDate: "2025-01-01", label: "2025 to 2026", toDate: "2026-12-31" },
    points: Array.from({ length: 24 }, (_, index) => ({
      label: `Month ${index + 1}`,
      values: [
        { label: "Spending", value: { value: `-${index + 1}.00`, display: `AED -${index + 1}.00` } },
        { label: "Income", value: { value: `${index + 1}.00`, display: `AED ${index + 1}.00` } },
      ],
    })),
  };
}

export const phase4Definition = {
  id: "phase4",
  frIds: PHASE4_FR_IDS,
  async run({ page, frontendBaseUrl }) {
    const fr = {};
    const capturedRequests = [];
    let requestIndex = 0;

    await page.route("**/api/chat", async (route) => {
      requestIndex += 1;
      const payload = parseJsonSafely(route.request().postData());
      capturedRequests.push(payload);
      if (requestIndex === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      const responseMessage =
        requestIndex === 1
          ? `Grounded answer: ${String(payload.message ?? "")}\n${"Supporting detail.\n".repeat(64)}`
          : `Grounded answer: ${String(payload.message ?? "")}`;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: chatResponse(
          responseMessage,
          requestIndex === 1 ? twentyBarChart() : requestIndex === 2 ? twentyFourPointLineChart() : null,
        ),
      });
    });

    await page.goto(`${frontendBaseUrl}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ai-chat-input"]', { timeout: 30000 });

    const enterPrompt = `phase4-enter-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', enterPrompt);
    await page.keyboard.press("Enter");
    const pendingVisible = await page
      .waitForSelector('[data-testid="ai-chat-pending"]', { timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    const sendDisabledWhilePending = await page.locator('[data-testid="ai-chat-send"]').isDisabled();
    await page.waitForSelector('[data-testid="ai-chat-pending"]', { state: "hidden", timeout: 15000 });

    const userMessagesAfterEnter = await page.locator('[data-testid="ai-chat-message-user"]').count();
    const assistantMessagesAfterEnter = await page.locator('[data-testid="ai-chat-message-assistant"]').count();
    const assistantVisible = await page
      .getByText(`Grounded answer: ${enterPrompt}`, { exact: false })
      .isVisible()
      .catch(() => false);
    const barChartExperience = await page.evaluate(() => {
      const scrollRegion = document.querySelector('[data-testid="ai-chat-visual-bar-scroll"]');
      const barChart = document.querySelector('[data-testid="ai-chat-visual-bar"]');
      if (!(scrollRegion instanceof HTMLElement) || !(barChart instanceof HTMLElement)) {
        return { present: false };
      }
      scrollRegion.scrollLeft = Math.min(120, scrollRegion.scrollWidth - scrollRegion.clientWidth);
      return {
        chartHeight: barChart.getBoundingClientRect().height,
        chartMinimumWidth: barChart.style.minWidth,
        pageHasNoHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        present: true,
        scrollable: scrollRegion.scrollWidth > scrollRegion.clientWidth,
        scrolled: scrollRegion.scrollLeft > 0,
      };
    });
    const chatComposition = await page.evaluate(() => {
      const main = document.querySelector('[data-testid="app-shell-main"]');
      const header = document.querySelector('[data-testid="ai-chat-header"]');
      const composer = document.querySelector('[data-testid="ai-chat-composer"]');
      const navigation = document.querySelector('[data-testid="app-shell-nav"]');
      const timeline = document.querySelector('[data-testid="ai-chat-timeline"]');
      const reset = document.querySelector('[data-testid="ai-chat-reset-trigger"]');
      const send = document.querySelector('[data-testid="ai-chat-send"]');
      if (
        !(main instanceof HTMLElement) ||
        !(header instanceof HTMLElement) ||
        !(composer instanceof HTMLElement) ||
        !(navigation instanceof HTMLElement) ||
        !(timeline instanceof HTMLElement)
      ) {
        return { controlsPresent: false };
      }

      main.scrollTop = 0;
      const headerBefore = header.getBoundingClientRect();
      const composerBefore = composer.getBoundingClientRect();
      timeline.scrollTop = timeline.scrollHeight;
      const headerAfter = header.getBoundingClientRect();
      const composerAfter = composer.getBoundingClientRect();
      const bodyText = document.body.innerText;
      const rootStyles = window.getComputedStyle(document.documentElement);

      return {
        controlsPresent: true,
        composerNavigationGap: navigation.getBoundingClientRect().top - composerAfter.bottom,
        composerStayedFixed: Math.abs(composerBefore.top - composerAfter.top) < 1,
        headerStayedFixed: Math.abs(headerBefore.top - headerAfter.top) < 1,
        mainOverflowY: window.getComputedStyle(main).overflowY,
        mainScrollTop: main.scrollTop,
        pageGutterCssValue: rootStyles.getPropertyValue("--mt-page-gutter").trim(),
        pageGutterPx: Number.parseFloat(rootStyles.fontSize),
        pageScrollTop: window.scrollY,
        resetHasNoVisibleText: reset?.textContent?.trim() === "",
        sendHasNoVisibleText: send?.textContent?.trim() === "",
        timelineCanScroll: timeline.scrollHeight > timeline.clientHeight && timeline.scrollTop > 0,
        timelineOverflowY: window.getComputedStyle(timeline).overflowY,
        unwantedChromeAbsent:
          !bodyText.includes("Conversation") &&
          !bodyText.includes("Enter to send, Shift+Enter for a new line.") &&
          !bodyText.includes("How much did I spend this month?"),
      };
    });
    const fullHeightGutter = assessAiChatComposerNavigationGutter(chatComposition);
    const normalHostStableHeight = await page.locator('[data-testid="app-shell-nav"]').evaluate((navigation) =>
      Math.round(navigation.getBoundingClientRect().top),
    );
    await page.evaluate((viewportStableHeight) => {
      window.__qaTelegram.setViewport({ viewportHeight: window.innerHeight, viewportStableHeight });
    }, normalHostStableHeight);
    await page.waitForTimeout(100);
    const normalHostGutter = assessAiChatComposerNavigationGutter(await page.evaluate(() => {
      const composer = document.querySelector('[data-testid="ai-chat-composer"]');
      const navigation = document.querySelector('[data-testid="app-shell-nav"]');
      const rootStyles = window.getComputedStyle(document.documentElement);
      return {
        composerNavigationGap:
          composer instanceof HTMLElement && navigation instanceof HTMLElement
            ? navigation.getBoundingClientRect().top - composer.getBoundingClientRect().bottom
            : Number.NaN,
        pageGutterCssValue: rootStyles.getPropertyValue("--mt-page-gutter").trim(),
        pageGutterPx: Number.parseFloat(rootStyles.fontSize),
      };
    }));
    await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      window.__qaTelegram.setViewport({ viewportHeight, viewportStableHeight: viewportHeight });
    });
    if (
      !chatComposition.controlsPresent ||
      !fullHeightGutter.valid ||
      !normalHostGutter.valid ||
      !chatComposition.headerStayedFixed ||
      !chatComposition.composerStayedFixed ||
      chatComposition.mainOverflowY !== "hidden" ||
      chatComposition.mainScrollTop !== 0 ||
      Math.abs(chatComposition.pageScrollTop) > 4 ||
      !chatComposition.timelineCanScroll ||
      chatComposition.timelineOverflowY !== "auto" ||
      !chatComposition.unwantedChromeAbsent ||
      !chatComposition.resetHasNoVisibleText ||
      !chatComposition.sendHasNoVisibleText ||
      !barChartExperience.present ||
      !barChartExperience.scrollable ||
      !barChartExperience.scrolled ||
      !barChartExperience.pageHasNoHorizontalOverflow ||
      barChartExperience.chartMinimumWidth !== "1440px" ||
      barChartExperience.chartHeight > 300
    ) {
      throw new Error(
        `AI Chat compact fixed-shell composition failed: ${JSON.stringify({ barChartExperience, chatComposition, fullHeightGutter, normalHostGutter })}.`,
      );
    }
    fr["FR-023"] =
      userMessagesAfterEnter === 1 && assistantMessagesAfterEnter === 1 && assistantVisible
        ? pass("Timeline renders distinct user and assistant messages after a grounded response.")
        : fail("Timeline roles or assistant response did not render as expected.");
    fr["FR-025"] =
      pendingVisible && sendDisabledWhilePending
        ? pass("Pending assistant state is visible and sending is disabled while awaiting a response.")
        : fail("Pending-state behavior failed.");

    await page.fill('[data-testid="ai-chat-input"]', "line one");
    await page.locator('[data-testid="ai-chat-input"]').press("Shift+Enter");
    await page.locator('[data-testid="ai-chat-input"]').type("line two");
    const shiftEnterPreserved = (await page.inputValue('[data-testid="ai-chat-input"]')).includes("\n");
    const buttonPrompt = `phase4-button-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', buttonPrompt);
    await page.click('[data-testid="ai-chat-send"]');
    await page.getByText(`Grounded answer: ${buttonPrompt}`).waitFor({ state: "visible", timeout: 15000 });
    const enterPayload = capturedRequests.find((payload) => payload.message === enterPrompt);
    const buttonPayload = capturedRequests.find((payload) => payload.message === buttonPrompt);
    const lineChartExperience = await page.evaluate(() => {
      const lineChart = document.querySelector('[data-testid="ai-chat-visual-line"]');
      const legend = document.querySelector('[data-testid="ai-chat-visual-line-legend"]');
      return {
        hasNoScrollRegion: document.querySelector('[data-testid="ai-chat-visual-line-scroll"]') === null,
        hasSeriesLabels:
          legend?.textContent?.includes("Spending") === true && legend.textContent.includes("Income"),
        pageHasNoHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        present: lineChart instanceof HTMLElement,
        fitsCard: lineChart instanceof HTMLElement && lineChart.scrollWidth <= lineChart.clientWidth + 1,
      };
    });
    const lineSurface = page.locator('[data-testid="ai-chat-visual-line"] .recharts-surface').first();
    await lineSurface.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    const lineTooltipText = await page
      .locator('[data-testid="ai-chat-visual-line"] .recharts-tooltip-wrapper')
      .textContent()
      .catch(() => "");
    const lineTooltipHasSeriesLabels =
      lineTooltipText?.includes("Spending") === true && lineTooltipText.includes("Income");
    if (
      !lineChartExperience.present ||
      !lineChartExperience.fitsCard ||
      !lineChartExperience.hasNoScrollRegion ||
      !lineChartExperience.hasSeriesLabels ||
      !lineTooltipHasSeriesLabels ||
      !lineChartExperience.pageHasNoHorizontalOverflow
    ) {
      throw new Error(
        `AI Chat long-line composition failed: ${JSON.stringify({ lineChartExperience, lineTooltipHasSeriesLabels, lineTooltipText })}.`,
      );
    }
    fr["FR-024"] =
      shiftEnterPreserved &&
      Array.isArray(enterPayload?.history) &&
      Array.isArray(buttonPayload?.history) &&
      buttonPayload.history.length === 2
        ? pass("Enter and button send work, Shift+Enter preserves multiline content, and completed history is sent.")
        : fail("Composer keyboard behavior or transient history payload failed.");

    await page.click('[data-testid="ai-chat-reset-trigger"]');
    const resetDialogVisible = await page.locator('[data-testid="ai-chat-reset-dialog"]').isVisible().catch(() => false);
    await page.click('[data-testid="ai-chat-reset-confirm"]');
    await page.waitForSelector('[data-testid="ai-chat-reset-dialog"]', { state: "hidden", timeout: 15000 });
    const usersAfterReset = await page.locator('[data-testid="ai-chat-message-user"]').count();
    const assistantsAfterReset = await page.locator('[data-testid="ai-chat-message-assistant"]').count();
    fr["FR-026"] =
      resetDialogVisible && usersAfterReset === 0 && assistantsAfterReset === 0
        ? pass("New chat requires confirmation and clears the current dialogue.")
        : fail("New-chat clearing behavior failed.");

    await page.unroute("**/api/chat");
    let failureSeen = false;
    await page.route("**/api/chat", async (route) => {
      if (!failureSeen) {
        failureSeen = true;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "unavailable" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: chatResponse("Recovered chat response.") });
    });
    const failurePrompt = `phase4-failure-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', failurePrompt);
    await page.click('[data-testid="ai-chat-send"]');
    await page.waitForSelector('[data-testid="ai-chat-error"]', { timeout: 15000 });
    const fallbackVisible = await page.locator('[data-testid="ai-chat-fallback"]').isVisible().catch(() => false);
    await page.click('[data-testid="ai-chat-retry-last"]');
    await page.getByText("Recovered chat response.").waitFor({ state: "visible", timeout: 15000 });
    const userCountAfterRetry = await page.locator('[data-testid="ai-chat-message-user"]').count();
    fr["FR-027"] =
      !fallbackVisible && userCountAfterRetry === 1
        ? pass("Failure shows a retry path without presenting a synthetic assistant answer or duplicating the user message.")
        : fail("Failure/retry recovery failed.");

    return { fr, artifacts: { capturedRequests } };
  },
};
