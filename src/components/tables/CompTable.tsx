"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { formatNumber } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: number;
  ticker: string;
  name: string;
  [key: string]: unknown;
}

interface MetricValue {
  companyId: number;
  metricKey: string;
  periodKey: string;
  numericValue: number | null;
  rawExcelError: string | null;
}

interface SummaryStats {
  median: number;
  mean: number;
  p75: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: string; // unique identifier for the column
  label: string;
  metricKey: string;
  periodKey: string;
  unit: string; // percent | multiple | currency | ratio | point_in_time
  group: string;
}

const COLUMN_DEFS: ColumnDef[] = [
  // Trading
  { key: "stock_price", label: "Price", metricKey: "stock_price", periodKey: "point_in_time", unit: "currency", group: "Trading" },
  { key: "ytd_change", label: "YTD %", metricKey: "ytd_change", periodKey: "percent", unit: "percent", group: "Trading" },

  // Capitalization
  { key: "equity_value", label: "Equity Value", metricKey: "equity_value", periodKey: "currency", unit: "currency", group: "Capitalization" },
  { key: "enterprise_value", label: "EV", metricKey: "enterprise_value", periodKey: "currency", unit: "currency", group: "Capitalization" },

  // Valuation – EV/Revenue
  { key: "ev_revenue_ltm", label: "EV/Rev LTM", metricKey: "ev_revenue", periodKey: "LTM", unit: "multiple", group: "Valuation" },
  { key: "ev_revenue_ntm", label: "EV/Rev NTM", metricKey: "ev_revenue", periodKey: "NTM", unit: "multiple", group: "Valuation" },
  { key: "ev_revenue_cy2025e", label: "EV/Rev CY25E", metricKey: "ev_revenue", periodKey: "CY2025E", unit: "multiple", group: "Valuation" },
  { key: "ev_revenue_cy2026e", label: "EV/Rev CY26E", metricKey: "ev_revenue", periodKey: "CY2026E", unit: "multiple", group: "Valuation" },
  { key: "ev_revenue_cy2027e", label: "EV/Rev CY27E", metricKey: "ev_revenue", periodKey: "CY2027E", unit: "multiple", group: "Valuation" },
  { key: "ev_ebitda_ntm", label: "EV/EBITDA NTM", metricKey: "ev_ebitda", periodKey: "NTM", unit: "multiple", group: "Valuation" },

  // Growth
  { key: "rev_growth_cy24_cy25", label: "Rev Gr CY24/25", metricKey: "revenue_growth", periodKey: "CY2024A_CY2025E", unit: "percent", group: "Growth" },
  { key: "rev_growth_cy25_cy26", label: "Rev Gr CY25/26", metricKey: "revenue_growth", periodKey: "CY2025E_CY2026E", unit: "percent", group: "Growth" },
  { key: "rev_growth_ntm", label: "Rev Gr NTM", metricKey: "revenue_growth", periodKey: "NTM", unit: "percent", group: "Growth" },

  // Margins
  { key: "gross_margin_ntm", label: "GM NTM", metricKey: "gross_margin", periodKey: "NTM", unit: "percent", group: "Margins" },
  { key: "gross_margin_cy2025e", label: "GM CY25E", metricKey: "gross_margin", periodKey: "CY2025E", unit: "percent", group: "Margins" },
  { key: "ebitda_margin_ntm", label: "EBITDA M NTM", metricKey: "ebitda_margin", periodKey: "NTM", unit: "percent", group: "Margins" },
  { key: "ebitda_margin_cy2025e", label: "EBITDA M CY25E", metricKey: "ebitda_margin", periodKey: "CY2025E", unit: "percent", group: "Margins" },

  // Financials
  { key: "fcf_margin_ntm", label: "FCF M NTM", metricKey: "fcf_margin", periodKey: "NTM", unit: "percent", group: "Financials" },
  { key: "rule_of_40_ntm", label: "Rule of 40 NTM", metricKey: "rule_of_40", periodKey: "NTM", unit: "ratio", group: "Financials" },
];

const COLUMN_GROUPS = ["Trading", "Capitalization", "Valuation", "Growth", "Margins", "Financials"];

const DEFAULT_VISIBLE_KEYS = new Set([
  "stock_price",
  "enterprise_value",
  "ev_revenue_ntm",
  "rev_growth_ntm",
  "gross_margin_ntm",
  "ebitda_margin_ntm",
  "fcf_margin_ntm",
  "rule_of_40_ntm",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMetricValue(
  metrics: MetricValue[] | undefined,
  metricKey: string,
  periodKey: string,
): { value: number | null; error: string | null } {
  if (!metrics) return { value: null, error: null };
  const mv = metrics.find((m) => m.metricKey === metricKey && m.periodKey === periodKey);
  if (!mv) return { value: null, error: null };
  return { value: mv.numericValue, error: mv.rawExcelError ?? null };
}

function formatUnit(value: number | null, unit: string): string {
  if (unit === "ratio") {
    if (value === null || value === undefined) return "—";
    return value.toFixed(1);
  }
  if (unit === "point_in_time") {
    return formatNumber(value, "currency");
  }
  return formatNumber(value, unit);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CompTableProps {
  section: string;
}

export default function CompTable({ section }: CompTableProps) {
  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, MetricValue[]>>({});
  const [summaries, setSummaries] = useState<Record<string, SummaryStats>>({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set(COLUMN_GROUPS));
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ------- Data fetching -------
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [companiesRes, metricsRes] = await Promise.all([
          fetch(`/api/companies?section=${encodeURIComponent(section)}`),
          fetch(`/api/metrics?section=${encodeURIComponent(section)}`),
        ]);

        if (cancelled) return;

        const companiesData: Company[] = await companiesRes.json();
        const metricsData: { data: Record<number, MetricValue[]>; summaries: Record<string, SummaryStats> } =
          await metricsRes.json();

        setCompanies(companiesData);
        setMetricsMap(metricsData.data ?? {});
        setSummaries(metricsData.summaries ?? {});
      } catch (err) {
        console.error("Failed to load comp table data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [section]);

  // ------- Visible columns (respecting group toggles + default keys) -------
  const visibleColumns = useMemo(() => {
    return COLUMN_DEFS.filter(
      (col) => visibleGroups.has(col.group) || DEFAULT_VISIBLE_KEYS.has(col.key),
    );
  }, [visibleGroups]);

  // ------- Filtered companies -------
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [companies, searchQuery]);

  // ------- Sorted companies -------
  const sortedCompanies = useMemo(() => {
    if (!sortColumn) return filteredCompanies;

    const col = COLUMN_DEFS.find((c) => c.key === sortColumn);
    if (!col) return filteredCompanies;

    return [...filteredCompanies].sort((a, b) => {
      const aVal = getMetricValue(metricsMap[a.id], col.metricKey, col.periodKey).value;
      const bVal = getMetricValue(metricsMap[b.id], col.metricKey, col.periodKey).value;

      // Nulls always go to the bottom
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredCompanies, sortColumn, sortDirection, metricsMap]);

  // ------- Handlers -------
  const toggleGroup = useCallback((group: string) => {
    setVisibleGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback(
    (colKey: string) => {
      if (sortColumn === colKey) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(colKey);
        setSortDirection("desc");
      }
    },
    [sortColumn],
  );

  // ------- Render helpers -------
  function renderCell(companyId: number, col: ColumnDef) {
    const { value, error } = getMetricValue(metricsMap[companyId], col.metricKey, col.periodKey);

    if (error) {
      return <span className="text-red-500 text-xs" title={error}>ERR</span>;
    }

    if (value === null || value === undefined) {
      return <span className="text-slate-300">&mdash;</span>;
    }

    return formatUnit(value, col.unit);
  }

  function renderSummaryCell(col: ColumnDef, stat: "median" | "mean" | "p75") {
    const key = `${col.metricKey}_${col.periodKey}`;
    const summaryRow = summaries[key];
    if (!summaryRow) return <span className="text-slate-300">&mdash;</span>;
    const value = summaryRow[stat];
    return formatUnit(value, col.unit);
  }

  // ------- Loading state -------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-sm text-slate-500">Loading comp table&hellip;</span>
      </div>
    );
  }

  // ------- Main render -------
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by ticker or name..."
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 w-64"
        />

        {/* Column group toggles */}
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {COLUMN_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => toggleGroup(group)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                visibleGroups.has(group)
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Table wrapper */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="comp-table w-full text-left whitespace-nowrap">
          {/* Header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white px-3 py-2 min-w-[72px]">Ticker</th>
              <th className="sticky left-[72px] z-20 bg-white px-3 py-2 min-w-[180px]">Name</th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 cursor-pointer select-none hover:text-blue-600 min-w-[100px]"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortColumn === col.key && (
                      <span className="text-blue-600">{sortDirection === "asc" ? "\u25B2" : "\u25BC"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedCompanies.map((company) => (
              <tr key={company.id}>
                <td className="sticky left-0 z-10 bg-white font-medium text-blue-700 px-3">
                  {company.ticker}
                </td>
                <td className="sticky left-[72px] z-10 bg-white px-3 text-slate-700 truncate max-w-[220px]">
                  {company.name}
                </td>
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-3 text-right">
                    {renderCell(company.id, col)}
                  </td>
                ))}
              </tr>
            ))}

            {sortedCompanies.length === 0 && (
              <tr>
                <td
                  colSpan={2 + visibleColumns.length}
                  className="text-center py-8 text-slate-400 text-sm"
                >
                  No companies found.
                </td>
              </tr>
            )}

            {/* Summary rows */}
            {sortedCompanies.length > 0 && (
              <>
                {(["median", "mean", "p75"] as const).map((stat) => (
                  <tr key={stat} className="summary-row">
                    <td className="sticky left-0 z-10 bg-slate-50 px-3 font-semibold text-slate-600">
                      {stat === "p75" ? "Top Quartile" : stat.charAt(0).toUpperCase() + stat.slice(1)}
                    </td>
                    <td className="sticky left-[72px] z-10 bg-slate-50 px-3" />
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-3 text-right">
                        {renderSummaryCell(col, stat)}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <p className="text-xs text-slate-400">
        Showing {sortedCompanies.length} of {companies.length} companies
      </p>
    </div>
  );
}
