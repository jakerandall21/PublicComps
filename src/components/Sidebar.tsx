"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  TrendingUp,
  Target,
  DollarSign,
  Percent,
  Briefcase,
  Server,
  LayoutGrid,
  CreditCard,
  Heart,
  Layers,
  Calculator,
  BarChart3,
  Upload,
} from "lucide-react";

const sections = [
  { key: "saas_high_growth", name: "SaaS High Growth", icon: TrendingUp },
  { key: "saas_rule_of_40", name: "SaaS Rule of 40", icon: Target },
  { key: "ebitda_dollar_bucket", name: "EBITDA by Dollar", icon: DollarSign },
  { key: "ebitda_margin_bucket", name: "EBITDA by Margin", icon: Percent },
  { key: "sapphire_public_holdings", name: "Sapphire Holdings", icon: Briefcase },
  { key: "infra_dev", name: "Infra / Dev", icon: Server },
  { key: "biz_apps", name: "Biz Apps", icon: LayoutGrid },
  { key: "fintech", name: "FinTech", icon: CreditCard },
  { key: "healthtech", name: "HealthTech", icon: Heart },
  { key: "vertical_saas", name: "Vertical SaaS", icon: Layers },
  { key: "finance_comp_set", name: "Finance Comp Set", icon: Calculator },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo Area */}
      <div className="px-5 py-6 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-tight">Sapphire Public Comps</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const href = `/dashboard/${section.key}`;
            const isActive = pathname === href;

            return (
              <li key={section.key}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-slate-700 text-white font-medium"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{section.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Links */}
      <div className="border-t border-slate-700 px-3 py-4 space-y-1">
        <Link
          href="/charts"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname === "/charts"
              ? "bg-slate-700 text-white font-medium"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <BarChart3 size={16} className="shrink-0" />
          <span>Charts</span>
        </Link>
        <Link
          href="/upload"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname === "/upload"
              ? "bg-slate-700 text-white font-medium"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Upload size={16} className="shrink-0" />
          <span>Upload Data</span>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full mt-4"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
