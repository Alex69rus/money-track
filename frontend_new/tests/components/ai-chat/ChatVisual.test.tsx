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
        period,
        title: "Spending by category",
      },
      {
        kind: "line",
        period,
        points: [
          { income: aed("100.00"), label: "January", spending: aed("50.00") },
          { income: aed("120.00"), label: "February", spending: aed("75.00") },
        ],
        title: "Income and spending trend",
      },
      {
        items: [{ label: "Food", share: { display: "100.0%", value: "100.0" }, value: aed("50.00") }],
        kind: "pie",
        period,
        title: "Spending share",
      },
      {
        columns: ["Date", "Category", "Amount"],
        kind: "table",
        period,
        rows: [["2099-01-10", "Food", "AED 50.00"]],
        title: "Transactions table",
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
    expect(screen.getByTestId("ai-chat-visual-pie")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-visual-table")).toBeInTheDocument();
    expect(screen.getAllByText("Food")).toHaveLength(3);
    expect(screen.getByText("January: AED 50.00 spending, AED 100.00 income")).toBeInTheDocument();
    expect(screen.getByText("100.0% · AED 50.00")).toBeInTheDocument();
  });

  it("keeps long trends full-width and gives long bar charts a card-scoped scroll region", () => {
    const barItems = Array.from({ length: 20 }, (_, index) => ({ label: `Category ${index + 1}`, value: aed(`${index + 1}.00`) }));
    const linePoints = Array.from({ length: 24 }, (_, index) => ({
      income: aed(`${index + 1}.00`),
      label: `Month ${index + 1}`,
      spending: aed(`-${index + 1}.00`),
    }));

    render(
      <>
        <ChatVisual visual={{ items: barItems, kind: "bar", period, title: "Spending by category" }} />
        <ChatVisual visual={{ kind: "line", period, points: linePoints, title: "Balance growth" }} />
      </>,
    );

    expect(screen.getByRole("region", { name: "Scroll horizontally to view all bar values" })).toHaveClass("overflow-x-auto");
    expect(screen.getByTestId("ai-chat-visual-bar")).toHaveStyle({ minWidth: "1440px" });
    expect(screen.getByTestId("ai-chat-visual-bar")).toHaveClass("h-72");
    expect(screen.queryByTestId("ai-chat-visual-line-scroll")).not.toBeInTheDocument();
    expect(screen.getByText("Category 20: AED 20.00")).toBeInTheDocument();
    expect(screen.getByText("Month 24: AED -24.00 spending, AED 24.00 income")).toBeInTheDocument();
  });
});
