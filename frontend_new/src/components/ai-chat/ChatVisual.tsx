import { type ComponentProps, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
  ChatChartSeriesValue,
  ChatChartValue,
  ChatLineVisual,
  ChatPieVisual,
  ChatTableVisual,
  ChatVisual,
} from "@/services/api/chat";

const SHARE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const LINE_SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const MINIMUM_BAR_WIDTH = 72;

function toChartValue(value: string): number {
  const valueAsNumber = Number(value);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
}

function displayFromPayload(payload: unknown, key: string): string {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return "Not available";
  }
  const display = (payload as Record<string, unknown>)[`${key}Display`];
  return typeof display === "string" ? display : "Not available";
}

type ChartSeries = { color: string; key: string; label: string };

function chartSeries(values: ChatChartSeriesValue[]): ChartSeries[] {
  return values.map((value, index) => ({
    color: LINE_SERIES_COLORS[index % LINE_SERIES_COLORS.length]!,
    key: `series${index}`,
    label: value.label,
  }));
}

function seriesChartData(
  items: Array<{ label: string; values: ChatChartSeriesValue[] }>,
  series: ChartSeries[],
): Array<Record<string, number | string>> {
  return items.map((item) => {
    const data: Record<string, number | string> = { label: item.label };
    for (const seriesItem of series) {
      const value = item.values.find((itemValue) => itemValue.label === seriesItem.label)?.value;
      if (!value) {
        continue;
      }
      data[seriesItem.key] = toChartValue(value.value);
      data[`${seriesItem.key}Display`] = value.display;
    }
    return data;
  });
}

function seriesChartConfig(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((item) => [item.key, { color: item.color, label: item.label }]),
  ) satisfies ChartConfig;
}

function SeriesTooltip({
  series,
  ...props
}: { series: ChartSeries[] } & ComponentProps<typeof ChartTooltipContent>): JSX.Element {
  return (
    <ChartTooltipContent
      {...props}
      formatter={(value, name, _item, _index, payload) => {
        const item = series.find((seriesItem) => seriesItem.key === String(name));
        const label = item?.label ?? String(name);
        const display = typeof value === "number" && item !== undefined ? displayFromPayload(payload, item.key) : "Not available";
        return (
          <>
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-mono font-medium text-foreground tabular-nums">{display}</span>
          </>
        );
      }}
    />
  );
}

function PieTooltip(props: ComponentProps<typeof ChartTooltipContent>): JSX.Element {
  return (
    <ChartTooltipContent
      {...props}
      formatter={(_value, _name, _item, _index, payload) => (
        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">{displayFromPayload(payload, "value")}</span>
      )}
      nameKey="label"
    />
  );
}

function toChartShare(value: ChatChartValue): number {
  const valueAsNumber = Number(value.value);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
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
  const series = chartSeries(visual.items[0]!.values);
  const chartData = seriesChartData(visual.items, series);
  const chartConfig = seriesChartConfig(series);
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
          config={chartConfig}
          data-testid="ai-chat-visual-bar"
          style={{ aspectRatio: "auto", minWidth: `${Math.max(MINIMUM_BAR_WIDTH * visual.items.length, MINIMUM_BAR_WIDTH * 4)}px` }}
        >
          <BarChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis angle={-35} axisLine={false} dataKey="label" height={60} textAnchor="end" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} width={36} />
            <ChartTooltip content={<SeriesTooltip series={series} />} />
            {series.map((item) => (
              <Bar dataKey={item.key} fill={`var(--color-${item.key})`} key={item.key} radius={4} />
            ))}
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          </BarChart>
        </ChartContainer>
      </div>
      <ChartFacts
        facts={visual.items.map(
          (item) => `${item.label}: ${item.values.map((value) => `${value.label} ${value.value.display}`).join(", ")}`,
        )}
      />
    </VisualCard>
  );
}

function LineVisual({ visual }: { visual: ChatLineVisual }): JSX.Element {
  const series = chartSeries(visual.points[0]!.values);
  const chartConfig = seriesChartConfig(series);
  const chartData = seriesChartData(visual.points, series);
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <ChartContainer className="min-h-56 w-full" config={chartConfig} data-testid="ai-chat-visual-line">
        <LineChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={24} tickLine={false} tickMargin={8} />
          <YAxis axisLine={false} tickLine={false} width={36} />
          <ChartTooltip
            content={<SeriesTooltip series={series} />}
          />
          {series.map((item) => (
            <Line dataKey={item.key} dot={false} key={item.key} stroke={`var(--color-${item.key})`} strokeWidth={2} type="monotone" />
          ))}
          <ChartLegend content={<ChartLegendContent testId="ai-chat-visual-line-legend" />} />
        </LineChart>
      </ChartContainer>
      <ChartFacts
        facts={visual.points.map(
          (point) =>
            `${point.label}: ${series
              .map((item) => {
                const value = point.values.find((seriesValue) => seriesValue.label === item.label);
                return `${item.label} ${value!.value.display}`;
              })
              .join(", ")}`,
        )}
      />
    </VisualCard>
  );
}

function PieVisual({ visual }: { visual: ChatPieVisual }): JSX.Element {
  const chartData = visual.items.map((item, index) => ({
    fill: SHARE_COLORS[index % SHARE_COLORS.length],
    label: item.label,
    value: toChartShare(item.share),
    valueDisplay: item.value.display,
  }));
  return (
    <VisualCard period={visual.period.label} title={visual.title}>
      <ChartContainer className="min-h-56 w-full" config={{}} data-testid="ai-chat-visual-pie">
        <PieChart>
          <ChartTooltip content={<PieTooltip />} />
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
