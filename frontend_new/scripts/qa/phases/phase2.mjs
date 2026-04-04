const PHASE2_FR_IDS = [
  "FR-010",
  "FR-011",
  "FR-012",
  "FR-013",
  "FR-014",
  "FR-015",
  "FR-016",
  "FR-035",
];

async function createQaTransaction(backendBaseUrl, note) {
  const payload = {
    transactionDate: new Date().toISOString(),
    amount: -1.23,
    note,
    categoryId: null,
    tags: ["qa-phase2"],
    currency: "AED",
    smsText: null,
    messageId: null,
  };

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

function pass(evidence) {
  return { pass: true, evidence };
}

function fail(evidence) {
  return { pass: false, evidence };
}

export const phase2Definition = {
  id: "phase2",
  frIds: PHASE2_FR_IDS,
  async run({ page, backendBaseUrl, frontendBaseUrl }) {
    const fr = {};
    const qaNote = `__qa_phase2_${Date.now()}__`;

    const created = await createQaTransaction(backendBaseUrl, qaNote);
    const transactionId = created.id;

    await page.goto(`${frontendBaseUrl}/transactions`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("#transactions-search-text", { timeout: 30000 });
    const baselineNavigations = page.__mainFrameNavigations;

    await page.fill("#transactions-search-text", qaNote);
    await page.waitForTimeout(1200);

    const row = page.locator(`[data-testid="tx-desktop-row-${transactionId}"]`);
    await row.waitFor({ state: "visible", timeout: 30000 });

    const categoryButton = page.locator(`[data-testid="tx-desktop-category-${transactionId}"]`);
    const tagsButton = page.locator(`[data-testid="tx-desktop-tags-${transactionId}"]`);
    const editButton = page.locator(`[data-testid="tx-desktop-edit-${transactionId}"]`);

    await categoryButton.click();
    await page.waitForSelector('[data-testid="tx-category-dialog"]', { timeout: 15000 });
    fr["FR-010"] = pass("Category action in transaction row opens dedicated category selector.");

    const categorySearchVisible = await page.locator('[data-testid="tx-category-search"]').isVisible();
    const categoryUpdateVisible = await page.locator('[data-testid="tx-category-update"]').isVisible();
    fr["FR-011"] =
      categorySearchVisible && categoryUpdateVisible
        ? pass("Category selector is searchable and uses explicit Update confirmation.")
        : fail("Category selector is missing searchable input or explicit Update confirmation.");

    const categoryOptions = page.locator('[data-testid^="tx-category-option-"]');
    const optionCount = await categoryOptions.count();
    for (let index = 0; index < optionCount; index += 1) {
      const option = categoryOptions.nth(index);
      const testId = (await option.getAttribute("data-testid")) ?? "";
      if (testId === "tx-category-option-uncategorized") {
        continue;
      }
      await option.click();
      break;
    }
    await page.locator('[data-testid="tx-category-update"]').click();
    await page.waitForSelector('[data-testid="tx-category-dialog"]', { state: "hidden", timeout: 15000 });

    await tagsButton.click();
    await page.waitForSelector('[data-testid="tx-tags-dialog"]', { timeout: 15000 });
    const tagsSearchVisible = await page.locator('[data-testid="tx-tags-search"]').isVisible();
    const tagsUpdateVisible = await page.locator('[data-testid="tx-tags-update"]').isVisible();
    fr["FR-012"] =
      tagsSearchVisible && tagsUpdateVisible
        ? pass("Tag selector opens as a dedicated surface with explicit Update confirmation.")
        : fail("Tag selector is missing dedicated search or explicit Update confirmation.");

    const newTag = `qa-tag-${Date.now().toString().slice(-6)}`;
    await page.fill('[data-testid="tx-tags-search"]', newTag);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    if (await page.locator('[data-testid="tx-tags-add-from-search"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="tx-tags-add-from-search"]').click();
    }
    await page.locator('[data-testid="tx-tags-update"]').click();
    await page.waitForSelector('[data-testid="tx-tags-dialog"]', { state: "hidden", timeout: 15000 });

    await editButton.click();
    await page.waitForSelector('[data-testid="tx-edit-dialog"]', { timeout: 15000 });
    const amountValue = await page.locator("#transaction-edit-amount").inputValue();
    const currencyValue = await page.locator("#transaction-edit-currency").inputValue();
    const dateValue = await page.locator("#transaction-edit-date").inputValue();
    fr["FR-013"] =
      amountValue && currencyValue && dateValue
        ? pass("Full transaction edit dialog opens with prefilled values.")
        : fail("Edit dialog opened but one or more required prefilled fields were empty.");

    await page.fill("#transaction-edit-amount", "0");
    await page.locator('[data-testid="tx-edit-save"]').click();
    const zeroValidationVisible = await page.locator("text=Amount cannot be zero.").isVisible().catch(() => false);
    fr["FR-014"] = zeroValidationVisible
      ? pass("Required-field validation blocks zero amount and shows a clear validation error.")
      : fail("Expected required validation for zero amount was not shown.");

    await page.fill("#transaction-edit-amount", "2.34");
    await page.fill("#transaction-edit-note", `${qaNote}-updated`);
    await page.locator('[data-testid="tx-edit-save"]').click();
    await page.waitForSelector('[data-testid="tx-edit-dialog"]', { state: "hidden", timeout: 15000 });

    await page.locator(`[data-testid="tx-desktop-edit-${transactionId}"]`).click();
    await page.waitForSelector('[data-testid="tx-edit-dialog"]', { timeout: 15000 });
    await page.locator('[data-testid="tx-edit-delete-trigger"]').click();
    await page.waitForSelector('[data-testid="tx-edit-delete-confirm-dialog"]', { timeout: 15000 });
    fr["FR-015"] = pass("Delete flow uses explicit confirmation dialog before destructive action.");

    const labelsPresent =
      (await page.locator('input[aria-label="Transaction amount"]').count()) > 0 &&
      (await page.locator('input[aria-label="Transaction currency"]').count()) > 0 &&
      (await page.locator('input[aria-label="Transaction date and time"]').count()) > 0 &&
      (await page.locator('textarea[aria-label="Transaction note"]').count()) > 0 &&
      (await page.locator('[data-testid="tx-edit-open-category"]').count()) > 0 &&
      (await page.locator('[data-testid="tx-edit-open-tags"]').count()) > 0;
    fr["FR-035"] = labelsPresent
      ? pass("Phase 2 interactive controls expose semantic labels and are directly addressable.")
      : fail("One or more required Phase 2 interactive controls are missing semantic labels.");

    await page.locator('[data-testid="tx-edit-delete-confirm"]').click();
    await page.waitForSelector('[data-testid="tx-edit-delete-confirm-dialog"]', {
      state: "hidden",
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    const stillVisible = await row.isVisible().catch(() => false);
    const unchangedPath = page.url().includes("/transactions");
    const noFullReload = page.__mainFrameNavigations === baselineNavigations;

    fr["FR-016"] =
      !stillVisible && unchangedPath && noFullReload
        ? pass("Update/delete mutations apply in-place in the list without a full page reload.")
        : fail(
            `In-place update/delete check failed (rowVisible=${stillVisible}, unchangedPath=${unchangedPath}, navigations=${page.__mainFrameNavigations}, baseline=${baselineNavigations}).`,
          );

    return {
      fr,
      artifacts: {
        transactionId,
        qaNote,
      },
    };
  },
};
