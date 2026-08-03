import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatVisual } from "@/components/ai-chat/ChatVisual";
import type { ChatVisual as ChatVisualData } from "@/services/api/chat";

const period = { fromDate: "2099-01-01", label: "January 2099", toDate: "2099-01-31" };
const chartValue = (value: string, display = value) => ({ display, value });

describe("ChatVisual", () => {
  it("renders every backend-supported visual with text or table facts", () => {
    const visuals: ChatVisualData[] = [
      {
        items: [{ label: "Food", values: [{ label: "Transaction count", value: chartValue("5", "5 transactions") }]}],
        kind: "bar",
        period,
        title: "Spending by category",
      },
      {
        kind: "line",
        period,
        points: [
          { label: "January", values: [{ label: "Spending", value: chartValue("50.00", "AED 50.00") }, { label: "Income", value: chartValue("100.00", "AED 100.00") }] },
          { label: "February", values: [{ label: "Spending", value: chartValue("75.00", "AED 75.00") }, { label: "Income", value: chartValue("120.00", "AED 120.00") }] },
        ],
        title: "Income and spending trend",
      },
      {
        items: [{ label: "Food", share: { display: "100.0%", value: "100.0" }, value: chartValue("50.00", "AED 50.00") }],
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
    expect(screen.getByTestId("ai-chat-visual-line-legend")).toHaveTextContent("Spending");
    expect(screen.getByTestId("ai-chat-visual-line-legend")).toHaveTextContent("Income");
    expect(screen.getByText("January: Spending AED 50.00, Income AED 100.00")).toBeInTheDocument();
    expect(screen.getByText("100.0% · AED 50.00")).toBeInTheDocument();
  });

  it("keeps long trends full-width and gives long bar charts a card-scoped scroll region", () => {
    const barItems = Array.from({ length: 20 }, (_, index) => ({
      label: `Category ${index + 1}`,
      values: [{ label: "Transaction count", value: chartValue(`${index + 1}.00`, `${index + 1} transactions`) }],
    }));
    const linePoints = Array.from({ length: 24 }, (_, index) => ({
      label: `Month ${index + 1}`,
      values: [
        { label: "Spending", value: chartValue(`-${index + 1}.00`, `AED -${index + 1}.00`) },
        { label: "Income", value: chartValue(`${index + 1}.00`, `AED ${index + 1}.00`) },
      ],
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
    expect(screen.getByText("Category 20: Transaction count 20 transactions")).toBeInTheDocument();
    expect(screen.getByText("Month 24: Spending AED -24.00, Income AED 24.00")).toBeInTheDocument();
  });

  it("renders an arbitrary, truthfully named line series", () => {
    render(
      <ChatVisual
        visual={{
          kind: "line",
          period,
          points: [
            { label: "January", values: [{ label: "Cumulative balance", value: chartValue("100.00", "AED 100.00") }] },
            { label: "February", values: [{ label: "Cumulative balance", value: chartValue("150.00", "AED 150.00") }] },
          ],
          title: "Balance growth",
        }}
      />,
    );

    expect(screen.getByTestId("ai-chat-visual-line-legend")).toHaveTextContent("Cumulative balance");
    expect(screen.getByText("February: Cumulative balance AED 150.00")).toBeInTheDocument();
  });
});
