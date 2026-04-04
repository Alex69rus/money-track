import { todoMatrix } from "./scaffold-utils.mjs";

const PHASE3_FR_IDS = ["FR-018", "FR-019", "FR-020", "FR-021", "FR-022"];

const PHASE3_TODO_HINTS = {
  "FR-018":
    "Open analytics and assert date-range constrained analysis (data changes when range changes).",
  "FR-019":
    "Assert analytics renders summary stats, category spend, tag spend, and monthly trends widgets.",
  "FR-020": "Assert analytics has loading, error-with-retry, and no-data states.",
  "FR-021": "Assert date-range changes recompute all analytics widgets consistently.",
  "FR-022":
    "Assert category drilldown opens a category-filtered transactions popup/list and closes explicitly.",
};

export const phase3Definition = {
  id: "phase3",
  frIds: PHASE3_FR_IDS,
  async run() {
    return {
      fr: todoMatrix(PHASE3_FR_IDS, PHASE3_TODO_HINTS),
      artifacts: {
        scaffold: true,
        next_step:
          "Replace TODO FR entries with real Playwright checks in phase3Definition.run.",
      },
    };
  },
};
