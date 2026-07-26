import { fail, pass } from "./scaffold-utils.mjs";

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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: chatResponse(`Grounded answer: ${String(payload.message ?? "")}`),
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
    const assistantVisible = await page.getByText(`Grounded answer: ${enterPrompt}`).isVisible().catch(() => false);
    fr["FR-023"] =
      userMessagesAfterEnter === 1 && assistantMessagesAfterEnter >= 2 && assistantVisible
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
      resetDialogVisible && usersAfterReset === 0 && assistantsAfterReset === 1
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
