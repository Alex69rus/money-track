import { describe, expect, it } from "vitest";
import {
  AI_CHAT_COMPOSER_NAVIGATION_GUTTER,
  assessAiChatComposerNavigationGutter,
} from "./ai-chat-layout.mjs";

const intendedLayout = {
  composerNavigationGap: 16,
  pageGutterCssValue: AI_CHAT_COMPOSER_NAVIGATION_GUTTER,
  pageGutterPx: 16,
};

describe("AI Chat composer navigation-gutter contract", () => {
  it("accepts the standard product gutter", () => {
    expect(assessAiChatComposerNavigationGutter(intendedLayout).valid).toBe(true);
  });

  it.each([
    ["flush", 0],
    ["excessively separated", 60],
  ])("rejects a %s composer", (_description, composerNavigationGap) => {
    expect(assessAiChatComposerNavigationGutter({ ...intendedLayout, composerNavigationGap }).valid).toBe(false);
  });

  it("rejects an implementation that changes the declared visual gutter", () => {
    expect(
      assessAiChatComposerNavigationGutter({ ...intendedLayout, pageGutterCssValue: "0px" }).valid,
    ).toBe(false);
  });
});
