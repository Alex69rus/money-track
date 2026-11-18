// This is deliberately a UX contract, rather than a copy of the current
// implementation's measured value. A future change that makes the composer
// flush with navigation (or gives it excess space) must fail QA explicitly.
export const AI_CHAT_COMPOSER_NAVIGATION_GUTTER = "1rem";
export const AI_CHAT_COMPOSER_NAVIGATION_GUTTER_TOLERANCE_PX = 2;

export type AiChatComposerNavigationLayout = {
  pageGutterPx: number;
  composerNavigationGap: number;
  pageGutterCssValue: string;
};

export function assessAiChatComposerNavigationGutter<
  TLayout extends AiChatComposerNavigationLayout,
>(
  layout: TLayout,
): TLayout & {
  expectedGutterCssValue: typeof AI_CHAT_COMPOSER_NAVIGATION_GUTTER;
  expectedGutterPx: number;
  gapDeltaPx: number;
  valid: boolean;
} {
  const expectedGutterPx = layout.pageGutterPx;
  const gapDeltaPx = Math.abs(layout.composerNavigationGap - expectedGutterPx);
  const valid =
    layout.pageGutterCssValue === AI_CHAT_COMPOSER_NAVIGATION_GUTTER &&
    Number.isFinite(expectedGutterPx) &&
    gapDeltaPx <= AI_CHAT_COMPOSER_NAVIGATION_GUTTER_TOLERANCE_PX;

  return {
    ...layout,
    expectedGutterCssValue: AI_CHAT_COMPOSER_NAVIGATION_GUTTER,
    expectedGutterPx,
    gapDeltaPx,
    valid,
  };
}
