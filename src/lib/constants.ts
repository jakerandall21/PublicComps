export const METRIC_FAMILIES = {
  identity: "Identity",
  trading: "Trading Data",
  capitalization: "Capitalization",
  valuation_multiples: "Valuation Multiples",
  operating_metrics: "Operating Metrics",
  absolute_financials: "Absolute Financials",
} as const;

export const DEFAULT_VISIBLE_COLUMNS = [
  "ticker",
  "name",
  "stock_price",
  "ev_revenue_ntm",
  "revenue_growth_ntm",
  "gross_margin_ntm",
  "ebitda_margin_ntm",
  "fcf_margin_ntm",
  "rule_of_40_ntm",
  "enterprise_value",
];

export const PERIOD_KEYS = [
  "LTM",
  "NTM",
  "CY2022A",
  "CY2023A",
  "CY2024A",
  "CY2025E",
  "CY2026E",
  "CY2027E",
  "CY2028E",
] as const;

export const GROWTH_COHORTS = [
  { key: "hyper_growth", label: "Hyper Growth (>30%)", color: "#10b981", min: 0.30 },
  { key: "high_growth", label: "High Growth (20-30%)", color: "#3b82f6", min: 0.20, max: 0.30 },
  { key: "medium_growth", label: "Medium Growth (15-20%)", color: "#f59e0b", min: 0.15, max: 0.20 },
  { key: "low_growth", label: "Low Growth (<15%)", color: "#ef4444", max: 0.15 },
] as const;
