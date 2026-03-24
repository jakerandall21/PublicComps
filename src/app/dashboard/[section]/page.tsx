import { notFound } from "next/navigation";
import { SECTIONS } from "@/lib/utils";
import CompTable from "@/components/tables/CompTable";

interface PageProps {
  params: { section: string };
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  saas_high_growth: "High-growth SaaS companies with strong revenue acceleration and market momentum.",
  saas_rule_of_40: "SaaS companies evaluated on the Rule of 40 (revenue growth + profit margin).",
  ebitda_dollar_bucket: "Companies grouped by absolute EBITDA dollar output.",
  ebitda_margin_bucket: "Companies grouped by EBITDA margin profile.",
  sapphire_public_holdings: "Public companies in the Sapphire Ventures portfolio.",
  infra_dev: "Infrastructure and developer-tools focused software companies.",
  biz_apps: "Business applications and horizontal SaaS platforms.",
  fintech: "Financial technology and payments companies.",
  healthtech: "Healthcare technology and digital health companies.",
  vertical_saas: "Vertical SaaS companies serving specific industries.",
  finance_comp_set: "Comparable companies used for financial benchmarking.",
};

export default function SectionDashboardPage({ params }: PageProps) {
  const { section } = params;

  const sectionMeta = SECTIONS.find((s) => s.key === section);

  if (!sectionMeta) {
    notFound();
  }

  const description = SECTION_DESCRIPTIONS[section] ?? "";

  return (
    <div className="px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{sectionMeta.name}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      <CompTable section={section} />
    </div>
  );
}
