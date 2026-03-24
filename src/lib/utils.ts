import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return "—";

  switch (unit) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "multiple":
      return `${value.toFixed(1)}x`;
    case "currency":
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(2)}`;
    case "count":
      return value.toLocaleString();
    default:
      return value.toFixed(2);
  }
}

export function getGrowthCohort(ntmGrowth: number | null): string {
  if (ntmGrowth === null) return "Unknown";
  if (ntmGrowth > 0.30) return "Hyper Growth (>30%)";
  if (ntmGrowth > 0.20) return "High Growth (20-30%)";
  if (ntmGrowth > 0.15) return "Medium Growth (15-20%)";
  return "Low Growth (<15%)";
}

export function getCohortColor(cohort: string): string {
  switch (cohort) {
    case "Hyper Growth (>30%)": return "#10b981";
    case "High Growth (20-30%)": return "#3b82f6";
    case "Medium Growth (15-20%)": return "#f59e0b";
    case "Low Growth (<15%)": return "#ef4444";
    default: return "#6b7280";
  }
}

export const SECTIONS = [
  { key: "saas_high_growth", name: "SaaS High Growth", icon: "TrendingUp" },
  { key: "saas_rule_of_40", name: "SaaS Rule of 40", icon: "Target" },
  { key: "ebitda_dollar_bucket", name: "EBITDA by Dollar", icon: "DollarSign" },
  { key: "ebitda_margin_bucket", name: "EBITDA by Margin", icon: "Percent" },
  { key: "sapphire_public_holdings", name: "Sapphire Holdings", icon: "Briefcase" },
  { key: "infra_dev", name: "Infra / Dev", icon: "Server" },
  { key: "biz_apps", name: "Biz Apps", icon: "LayoutGrid" },
  { key: "fintech", name: "FinTech", icon: "CreditCard" },
  { key: "healthtech", name: "HealthTech", icon: "Heart" },
  { key: "vertical_saas", name: "Vertical SaaS", icon: "Layers" },
  { key: "finance_comp_set", name: "Finance Comp Set", icon: "Calculator" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
