"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SnapshotPoint {
  snapshotDate: string;
  numericValue: number;
}

type SnapshotData = Record<string, SnapshotPoint[]>;

const DATE_RANGES = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
  { label: "All", months: 0 },
];

const STACK_COLORS = [
  "#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#4f46e5", "#0d9488", "#ca8a04", "#be185d",
  "#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function formatDollarValue(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function PortfolioValueTimeSeries() {
  const [rawData, setRawData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("All");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/snapshots?family=portfolio_value");
        if (!res.ok) throw new Error("Failed to fetch");
        const data: SnapshotData = await res.json();
        setRawData(data);
      } catch {
        setRawData({});
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const seriesKeys = useMemo(() => {
    if (!rawData) return [];
    return Object.keys(rawData);
  }, [rawData]);

  const isStacked = seriesKeys.length > 1;

  const chartData = useMemo(() => {
    if (!rawData || seriesKeys.length === 0) return [];

    const dateMap: Record<string, Record<string, number>> = {};
    for (const [seriesKey, points] of Object.entries(rawData)) {
      for (const point of points) {
        const dateStr = point.snapshotDate.split("T")[0];
        if (!dateMap[dateStr]) dateMap[dateStr] = {};
        dateMap[dateStr][seriesKey] = point.numericValue;
      }
    }

    let sortedDates = Object.keys(dateMap).sort();

    const rangeObj = DATE_RANGES.find((r) => r.label === dateRange);
    if (rangeObj && rangeObj.months > 0 && sortedDates.length > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - rangeObj.months);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      sortedDates = sortedDates.filter((d) => d >= cutoffStr);
    }

    return sortedDates.map((date) => ({
      date,
      dateLabel: formatDateLabel(date),
      ...dateMap[date],
    }));
  }, [rawData, seriesKeys, dateRange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!rawData || seriesKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-sm">
          No historical snapshot data available. Upload weekly data to populate
          this chart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Sapphire Public Holdings Value
        </h3>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.label} value={r.label}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            {seriesKeys.map((key, i) => (
              <linearGradient
                key={key}
                id={`gradient-${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={isStacked ? STACK_COLORS[i % STACK_COLORS.length] : "#2563eb"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isStacked ? STACK_COLORS[i % STACK_COLORS.length] : "#2563eb"}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={formatDollarValue}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
            formatter={(value: number, name: string) => [
              formatDollarValue(value),
              name,
            ]}
          />
          {isStacked && <Legend />}
          {seriesKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stackId={isStacked ? "1" : undefined}
              stroke={isStacked ? STACK_COLORS[i % STACK_COLORS.length] : "#2563eb"}
              fill={`url(#gradient-${key})`}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
