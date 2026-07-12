import { fail, pass } from "./scaffold-utils.mjs";

const PHASE4_FR_IDS = ["FR-023", "FR-024", "FR-025", "FR-026", "FR-027"];

function parseJsonSafely(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
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
        body: JSON.stringify({
          response: `Echo: ${String(payload.message ?? "")}`,
        }),
      });
    });

    await page.goto(`${frontendBaseUrl}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ai-chat-input"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="ai-chat-session-id"]', { timeout: 30000 });

    const enterPrompt = `phase4-enter-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', enterPrompt);
    await page.keyboard.press("Enter");

    const pendingVisible = await page
      .waitForSelector('[data-testid="ai-chat-pending"]', { timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    const sendDisabledWhilePending = await page.locator('[data-testid="ai-chat-send"]').isDisabled();
    await page.waitForSelector('[data-testid="ai-chat-pending"]', { state: "hidden", timeout: 15000 });
    await page.waitForTimeout(250);

    const userMessagesAfterEnter = await page.locator('[data-testid="ai-chat-message-user"]').count();
    const assistantMessagesAfterEnter = await page.locator('[data-testid="ai-chat-message-assistant"]').count();
    const assistantEchoVisible = await page
      .locator('[data-testid="ai-chat-message-assistant"]')
      .filter({ hasText: enterPrompt })
      .first()
      .isVisible()
      .catch(() => false);

    fr["FR-023"] =
      userMessagesAfterEnter >= 1 && assistantMessagesAfterEnter >= 2 && assistantEchoVisible
        ? pass("Timeline renders distinct user and assistant messages, including assistant reply after send.")
        : fail(
            `Timeline roles/reply check failed (userCount=${userMessagesAfterEnter}, assistantCount=${assistantMessagesAfterEnter}, assistantEcho=${assistantEchoVisible}).`,
          );

    fr["FR-025"] =
      pendingVisible && sendDisabledWhilePending
        ? pass("Pending assistant state is visible and send action is disabled while awaiting response.")
        : fail(
            `Pending-state behavior failed (pendingVisible=${pendingVisible}, sendDisabled=${sendDisabledWhilePending}).`,
          );

    await page.fill('[data-testid="ai-chat-input"]', "line one");
    await page.locator('[data-testid="ai-chat-input"]').press("Shift+Enter");
    await page.locator('[data-testid="ai-chat-input"]').type("line two");
    const inputAfterShiftEnter = await page.inputValue('[data-testid="ai-chat-input"]');
    const shiftEnterPreserved = inputAfterShiftEnter.includes("\n");

    const buttonPrompt = `phase4-button-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', buttonPrompt);
    await page.click('[data-testid="ai-chat-send"]');
    await page
      .locator('[data-testid="ai-chat-message-assistant"]')
      .filter({ hasText: buttonPrompt })
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    const enterDelivered = capturedRequests.some((payload) => payload.message === enterPrompt);
    const buttonDelivered = capturedRequests.some((payload) => payload.message === buttonPrompt);

    fr["FR-024"] =
      shiftEnterPreserved && enterDelivered && buttonDelivered
        ? pass("Enter and button send both work, while Shift+Enter keeps multiline input.")
        : fail(
            `Send-key behavior failed (shiftEnter=${shiftEnterPreserved}, enterDelivered=${enterDelivered}, buttonDelivered=${buttonDelivered}).`,
          );

    const sessionBeforeReset = (await page.locator('[data-testid="ai-chat-session-id"]').textContent()) ?? "";
    await page.click('[data-testid="ai-chat-reset-trigger"]');
    const resetDialogVisible = await page
      .locator('[data-testid="ai-chat-reset-dialog"]')
      .isVisible()
      .catch(() => false);
    await page.click('[data-testid="ai-chat-reset-confirm"]');
    await page.waitForSelector('[data-testid="ai-chat-reset-dialog"]', { state: "hidden", timeout: 15000 });

    const sessionAfterReset = (await page.locator('[data-testid="ai-chat-session-id"]').textContent()) ?? "";
    const userMessagesAfterReset = await page.locator('[data-testid="ai-chat-message-user"]').count();
    const assistantMessagesAfterReset = await page.locator('[data-testid="ai-chat-message-assistant"]').count();
    const sessionChanged = sessionAfterReset.trim() !== "" && sessionBeforeReset !== sessionAfterReset;

    fr["FR-026"] =
      resetDialogVisible && sessionChanged && userMessagesAfterReset === 0 && assistantMessagesAfterReset === 1
        ? pass("Reset requires confirmation and starts a fresh session timeline.")
        : fail(
            `Reset behavior failed (dialog=${resetDialogVisible}, sessionChanged=${sessionChanged}, userAfterReset=${userMessagesAfterReset}, assistantAfterReset=${assistantMessagesAfterReset}).`,
          );

    await page.unroute("**/api/chat");

    let failureRequestSeen = false;
    await page.route("**/api/chat", async (route) => {
      if (!failureRequestSeen) {
        failureRequestSeen = true;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "qa forced chat failure" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ response: "Recovered chat response." }),
      });
    });

    const failurePrompt = `phase4-failure-${Date.now()}`;
    await page.fill('[data-testid="ai-chat-input"]', failurePrompt);
    await page.click('[data-testid="ai-chat-send"]');
    await page.waitForSelector('[data-testid="ai-chat-error"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="ai-chat-fallback"]', { timeout: 15000 });
    const errorVisible = await page.locator('[data-testid="ai-chat-error"]').isVisible().catch(() => false);
    const fallbackVisible = await page.locator('[data-testid="ai-chat-fallback"]').isVisible().catch(() => false);

    fr["FR-027"] =
      errorVisible && fallbackVisible
        ? pass("Failures expose clear error feedback and fallback assistant messaging.")
        : fail(`Failure handling check failed (errorVisible=${errorVisible}, fallbackVisible=${fallbackVisible}).`);

    return {
      fr,
      artifacts: {
        capturedRequestCount: capturedRequests.length,
        sessionBeforeReset,
        sessionAfterReset,
      },
    };
  },
};
