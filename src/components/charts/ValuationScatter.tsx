"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
  Legend,
  ZAxis,
  LabelList,
} from "recharts";
import { getGrowthCohort, getCohortColor, formatNumber } from "@/lib/utils";

interface Company {
  id: number;
  ticker: string;
  name: string;
}

interface MetricValue {
  companyId: number;
  metricKey: string;
  periodKey: string;
  numericValue: number | null;
}

interface MetricsResponse {
  data: Record<number, MetricValue[]>;
  summaries: Record<string, { median: number; mean: number; p75: number }>;
}

interface ScatterPoint {
  companyId: number;
  ticker: string;
  name: string;
  x: number;
  y: number;
  cohort: string;
  color: string;
  ntmGrowth: number | null;
}

interface ValuationScatterProps {
  title: string;
  xMetricKey: string;
  xPeriodKey: string;
  xLabel: string;
  xUnit: "percent" | "multiple" | "currency";
  yMetricKey?: string;
  yPeriodKey?: string;
  yLabel?: string;
}

const COHORT_ENTRIES = [
  { label: "Hyper Growth (>30%)", color: "#10b981" },
  { label: "High Growth (20-30%)", color: "#3b82f6" },
  { label: "Medium Growth (15-20%)", color: "#f59e0b" },
  { label: "Low Growth (<15%)", color: "#ef4444" },
  { label: "Unknown", color: "#6b7280" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, xLabel, xUnit, yLabel }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point: ScatterPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-semibold text-gray-900">
        {point.name} ({point.ticker})
      </p>
      <p className="text-gray-600">
        {xLabel}: {formatNumber(point.x, xUnit)}
      </p>
      <p className="text-gray-600">
        {yLabel}: {point.y.toFixed(1)}x
      </p>
      <p className="text-gray-500 text-xs mt-1">{point.cohort}</p>
    </div>
  );
}

export default function ValuationScatter({
  title,
  xMetricKey,
  xPeriodKey,
  xLabel,
  xUnit,
  yMetricKey = "ev_revenue",
  yPeriodKey = "NTM",
  yLabel = "EV/NTM Revenue",
}: ValuationScatterProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const companiesRes = await fetch("/api/companies");
        if (!companiesRes.ok) throw new Error("Failed to fetch companies");
        const companiesData: Company[] = await companiesRes.json();
        setCompanies(companiesData);

        if (companiesData.length === 0) {
          setLoading(false);
          return;
        }

        const companyIds = companiesData.map((c) => c.id).join(",");
        const metricKeys = [xMetricKey, yMetricKey, "revenue_growth"]
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(",");
        const periodKeys = [xPeriodKey, yPeriodKey, "NTM"]
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(",");

        const metricsRes = await fetch(
          `/api/metrics?companyIds=${companyIds}&metricKeys=${metricKeys}&periodKeys=${periodKeys}`
        );
        if (!metricsRes.ok) throw new Error("Failed to fetch metrics");
        const metrics: MetricsResponse = await metricsRes.json();
        setMetricsData(metrics);
      } catch {
        setMetricsData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [xMetricKey, xPeriodKey, yMetricKey, yPeriodKey]);

  const scatterPoints = useMemo(() => {
    if (!metricsData || companies.length === 0) return [];

    const points: ScatterPoint[] = [];

    for (const company of companies) {
      const companyMetrics = metricsData.data[company.id];
      if (!companyMetrics) continue;

      const xMetric = companyMetrics.find(
        (m) => m.metricKey === xMetricKey && m.periodKey === xPeriodKey
      );
      const yMetric = companyMetrics.find(
        (m) => m.metricKey === yMetricKey && m.periodKey === yPeriodKey
      );
      const growthMetric = companyMetrics.find(
        (m) => m.metricKey === "revenue_growth" && m.periodKey === "NTM"
      );

      if (
        xMetric?.numericValue == null ||
        yMetric?.numericValue == null
      )
        continue;

      const ntmGrowth = growthMetric?.numericValue ?? null;
      const cohort = getGrowthCohort(ntmGrowth);
      const color = getCohortColor(cohort);

      points.push({
        companyId: company.id,
        ticker: company.ticker,
        name: company.name,
        x: xMetric.numericValue,
        y: yMetric.numericValue,
        cohort,
        color,
        ntmGrowth,
      });
    }

    return points;
  }, [companies, metricsData, xMetricKey, xPeriodKey, yMetricKey, yPeriodKey]);

  const highlightedTicker = searchTerm.trim().toUpperCase();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  if (scatterPoints.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-sm">
            No data available. Ensure companies and metrics are uploaded.
          </p>
        </div>
      </div>
    );
  }

  const xTickFormatter = (value: number) => formatNumber(value, xUnit);
  const yTickFormatter = (value: number) => `${value.toFixed(1)}x`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search ticker to highlight..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show labels
        </label>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={xTickFormatter}
          >
            <Label
              value={xLabel}
              offset={-10}
              position="insideBottom"
              style={{ fontSize: "12px", fill: "#6b7280" }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={yTickFormatter}
          >
            <Label
              value={yLabel}
              angle={-90}
              position="insideLeft"
              style={{ fontSize: "12px", fill: "#6b7280" }}
              offset={0}
            />
          </YAxis>
          <ZAxis range={[60, 60]} />
          <Tooltip
            content={
              <CustomTooltip xLabel={xLabel} xUnit={xUnit} yLabel={yLabel} />
            }
          />
          <Legend
            payload={COHORT_ENTRIES.map((c) => ({
              value: c.label,
              type: "circle" as const,
              color: c.color,
            }))}
          />
          <Scatter data={scatterPoints} isAnimationActive={false}>
            {scatterPoints.map((point, index) => {
              const isHighlighted =
                highlightedTicker &&
                point.ticker.toUpperCase().includes(highlightedTicker);
              return (
                <Cell
                  key={index}
                  fill={point.color}
                  stroke={isHighlighted ? "#000" : point.color}
                  strokeWidth={isHighlighted ? 3 : 1}
                  r={isHighlighted ? 8 : 5}
                  opacity={
                    highlightedTicker
                      ? isHighlighted
                        ? 1
                        : 0.25
                      : 0.85
                  }
                />
              );
            })}
            {showLabels && (
              <LabelList
                dataKey="ticker"
                position="top"
                style={{ fontSize: "9px", fill: "#374151" }}
                offset={8}
              />
            )}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
