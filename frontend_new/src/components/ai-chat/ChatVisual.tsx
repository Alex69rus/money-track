import { type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ChatBarVisual,
  ChatLineVisual,
  ChatPieVisual,
  ChatTableVisual,
  ChatVisual,
} from "@/services/api/chat";

const BAR_CHART_CONFIG = {
  value: { label: "Amount", color: "var(--chart-1)" },
} satisfies ChartConfig;

const LINE_CHART_CONFIG = {
  spending: { label: "Spending", color: "var(--chart-1)" },
  income: { label: "Income", color: "var(--chart-2)" },
} satisfies ChartConfig;

const SHARE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const MINIMUM_BAR_WIDTH = 72;

function toChartValue(amount: string): number {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function VisualCard({ children, period, title }: { children: ReactNode; period: string; title: string }): JSX.Element {
  return (
    <Card className="gap-0 overflow-hidden py-0" data-testid="ai-chat-visual">
      <CardHeader className="gap-1 border-b py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{period}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function ChartFacts({ facts }: { facts: string[] }): JSX.Element {
  return (
    <ul className="sr-only">
      {facts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
  );
}

function TableVisual({ visual }: { visual: ChatTableVisual }): JSX.Element {
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <Table data-testid="ai-chat-visual-table">
        <TableCaption className="sr-only">{visual.title}</TableCaption>
        <TableHeader>
          <TableRow>
            {visual.columns.map((column, index) => (
              <TableHead key={`${column}-${index}`}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visual.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, columnIndex) => (
                <TableCell key={columnIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </VisualCard>
  );
}

function BarVisual({ visual }: { visual: ChatBarVisual }): JSX.Element {
  const chartData = visual.items.map((item) => ({ label: item.label, value: toChartValue(item.value.amount) }));
  const displayByValue = new Map(chartData.map((item, index) => [item.value, visual.items[index]!.value.display]));
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <div
        aria-label="Scroll horizontally to view all bar values"
        className="overflow-x-auto pb-2"
        data-testid="ai-chat-visual-bar-scroll"
        role="region"
        tabIndex={0}
      >
        <ChartContainer
          className="h-72 min-h-72 w-full"
          config={BAR_CHART_CONFIG}
          data-testid="ai-chat-visual-bar"
          style={{ aspectRatio: "auto", minWidth: `${Math.max(MINIMUM_BAR_WIDTH * visual.items.length, MINIMUM_BAR_WIDTH * 4)}px` }}
        >
          <BarChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis angle={-35} axisLine={false} dataKey="label" height={60} textAnchor="end" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} width={36} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? displayByValue.get(value) ?? "Not available" : "Not available"
                  }
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>
      <ChartFacts facts={visual.items.map((item) => `${item.label}: ${item.value.display}`)} />
    </VisualCard>
  );
}

function LineVisual({ visual }: { visual: ChatLineVisual }): JSX.Element {
  const chartData = visual.points.map((point) => ({
    income: toChartValue(point.income.amount),
    label: point.label,
    spending: toChartValue(point.spending.amount),
  }));
  const displayBySeriesAndValue = new Map<string, string>();
  visual.points.forEach((point, index) => {
    const data = chartData[index]!;
    displayBySeriesAndValue.set(`spending:${data.spending}`, point.spending.display);
    displayBySeriesAndValue.set(`income:${data.income}`, point.income.display);
    displayBySeriesAndValue.set(`Spending:${data.spending}`, point.spending.display);
    displayBySeriesAndValue.set(`Income:${data.income}`, point.income.display);
  });
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <ChartContainer className="min-h-56 w-full" config={LINE_CHART_CONFIG} data-testid="ai-chat-visual-line">
        <LineChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={24} tickLine={false} tickMargin={8} />
          <YAxis axisLine={false} tickLine={false} width={36} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  typeof value === "number" && (typeof name === "string" || typeof name === "number")
                    ? displayBySeriesAndValue.get(`${name}:${value}`) ?? "Not available"
                    : "Not available"
                }
              />
            }
          />
          <Line dataKey="spending" dot={false} stroke="var(--color-spending)" strokeWidth={2} type="monotone" />
          <Line dataKey="income" dot={false} stroke="var(--color-income)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ChartContainer>
      <ChartFacts
        facts={visual.points.map((point) => `${point.label}: ${point.spending.display} spending, ${point.income.display} income`)}
      />
    </VisualCard>
  );
}

function PieVisual({ visual }: { visual: ChatPieVisual }): JSX.Element {
  const chartData = visual.items.map((item, index) => ({
    fill: SHARE_COLORS[index % SHARE_COLORS.length],
    label: item.label,
    value: toChartValue(item.share.value),
  }));
  const displayByValue = new Map(chartData.map((item, index) => [item.value, visual.items[index]!.value.display]));
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <ChartContainer className="min-h-56 w-full" config={BAR_CHART_CONFIG} data-testid="ai-chat-visual-pie">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  typeof value === "number" ? displayByValue.get(value) ?? "Not available" : "Not available"
                }
                nameKey="label"
              />
            }
          />
          <Pie data={chartData} dataKey="value" nameKey="label" />
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-col gap-1 text-sm" aria-label="Pie chart values">
        {visual.items.map((item) => (
          <li className="flex justify-between gap-3" key={item.label}>
            <span>{item.label}</span>
            <span className="text-muted-foreground">{item.share.display} · {item.value.display}</span>
          </li>
        ))}
      </ul>
    </VisualCard>
  );
}

export function ChatVisual({ visual }: { visual: ChatVisual }): JSX.Element {
  if (visual.kind === "table") {
    return <TableVisual visual={visual} />;
  }
  if (visual.kind === "bar") {
    return <BarVisual visual={visual} />;
  }
  if (visual.kind === "line") {
    return <LineVisual visual={visual} />;
  }
  return <PieVisual visual={visual} />;
}
