import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatVisual } from "@/components/ai-chat/ChatVisual";
import type { ChatVisual as ChatVisualData } from "@/services/api/chat";

const period = { fromDate: "2099-01-01", label: "January 2099", toDate: "2099-01-31" };
const aed = (amount: string) => ({ amount, currency: "AED", display: `AED ${amount}` });

describe("ChatVisual", () => {
  it("renders every backend-supported visual with text or table facts", () => {
    const visuals: ChatVisualData[] = [
      {
        items: [{ label: "Food", value: aed("50.00") }],
        kind: "bar",
        measure: "spending",
        period,
        title: "Spending by category",
      },
      {
        kind: "line",
        period,
        points: [
          { bucket: "2099-01", income: aed("100.00"), label: "January", spending: aed("50.00") },
          { bucket: "2099-02", income: aed("120.00"), label: "February", spending: aed("75.00") },
        ],
        title: "Income and spending trend",
      },
      {
        dimension: "category",
        items: [{ label: "Food", share: { display: "100.0%", value: "100.0" }, value: aed("50.00") }],
        kind: "category_share",
        period,
        title: "Spending share by category",
      },
      {
        kind: "table",
        period,
        rows: [
          {
            amount: aed("50.00"),
            category: "Food",
            dateTime: "2099-01-10T12:00:00+00:00",
            id: 1,
            note: "Lunch",
            tags: ["meal"],
          },
        ],
        tableKind: "transactions",
        title: "Transactions table",
      },
      {
        kind: "table",
        period,
        rows: [{ label: "Food", value: aed("50.00") }],
        tableKind: "breakdown",
        title: "Breakdown table",
      },
      {
        kind: "table",
        period,
        rows: [
          {
            change: aed("10.00"),
            changePercent: { display: "+20.0%", value: "20.0" },
            current: aed("60.00"),
            label: "Food",
            previous: aed("50.00"),
          },
        ],
        tableKind: "comparison",
        title: "Comparison table",
      },
    ];

    render(
      <>
        {visuals.map((visual) => (
          <ChatVisual key={visual.title} visual={visual} />
        ))}
      </>,
    );

    expect(screen.getByTestId("ai-chat-visual-bar")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-line")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-category-share")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-table-transactions")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-table-breakdown")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-table-comparison")).toBeInTheDocument();
    expect(screen.getAllByText("Food")).toHaveLength(5);
    expect(screen.getByText("January: AED 50.00 spending, AED 100.00 income")).toBeInTheDocument();
    expect(screen.getByText("100.0% · AED 50.00")).toBeInTheDocument();
  });
});
