"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SnapshotPoint {
  snapshotDate: string;
  numericValue: number;
}

type SnapshotData = Record<string, SnapshotPoint[]>;

const COHORTS = [
  { key: "hyper_growth", label: "Hyper Growth (>30%)", color: "#10b981" },
  { key: "high_growth", label: "High Growth (20-30%)", color: "#3b82f6" },
  { key: "medium_growth", label: "Medium Growth (15-20%)", color: "#f59e0b" },
  { key: "low_growth", label: "Low Growth (<15%)", color: "#ef4444" },
];

const DATE_RANGES = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
  { label: "All", months: 0 },
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export default function EvNtmTimeSeries() {
  const [rawData, setRawData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("All");
  const [visibleCohorts, setVisibleCohorts] = useState<Record<string, boolean>>(
    () => Object.fromEntries(COHORTS.map((c) => [c.key, true]))
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/snapshots?family=ev_ntm_revenue_by_cohort");
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

  const chartData = useMemo(() => {
    if (!rawData || Object.keys(rawData).length === 0) return [];

    // Collect all unique dates across all series
    const dateMap: Record<string, Record<string, number>> = {};
    for (const [seriesKey, points] of Object.entries(rawData)) {
      for (const point of points) {
        const dateStr = point.snapshotDate.split("T")[0];
        if (!dateMap[dateStr]) dateMap[dateStr] = {};
        dateMap[dateStr][seriesKey] = point.numericValue;
      }
    }

    let sortedDates = Object.keys(dateMap).sort();

    // Apply date range filter
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
  }, [rawData, dateRange]);

  const toggleCohort = (key: string) => {
    setVisibleCohorts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!rawData || Object.keys(rawData).length === 0) {
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
          EV/NTM Revenue by Growth Cohort
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

      <div className="flex flex-wrap gap-2">
        {COHORTS.map((cohort) => (
          <button
            key={cohort.key}
            onClick={() => toggleCohort(cohort.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              visibleCohorts[cohort.key]
                ? "text-white"
                : "bg-gray-100 text-gray-400"
            }`}
            style={
              visibleCohorts[cohort.key]
                ? { backgroundColor: cohort.color }
                : undefined
            }
          >
            {cohort.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
            labelFormatter={(label: string) => label}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}x`,
              name,
            ]}
          />
          <Legend />
          {COHORTS.map(
            (cohort) =>
              visibleCohorts[cohort.key] && (
                <Line
                  key={cohort.key}
                  type="monotone"
                  dataKey={cohort.key}
                  name={cohort.label}
                  stroke={cohort.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
