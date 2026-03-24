import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── a) MetricCatalog ───────────────────────────────────────────────
  const metrics = [
    { metricKey: "stock_price", family: "Trading Data", displayName: "Stock Price", unit: "currency", periodicity: "point_in_time" },
    { metricKey: "ytd_change", family: "Trading Data", displayName: "YTD Change", unit: "percent", periodicity: "point_in_time" },
    { metricKey: "ltm_high_premium_discount", family: "Trading Data", displayName: "LTM High Premium/Discount", unit: "percent", periodicity: "point_in_time" },
    { metricKey: "ltm_low_premium_discount", family: "Trading Data", displayName: "LTM Low Premium/Discount", unit: "percent", periodicity: "point_in_time" },
    { metricKey: "equity_value", family: "Capitalization", displayName: "Equity Value", unit: "currency", periodicity: "point_in_time" },
    { metricKey: "enterprise_value", family: "Capitalization", displayName: "Enterprise Value", unit: "currency", periodicity: "point_in_time" },
    { metricKey: "ev_revenue", family: "Valuation Multiples", displayName: "EV / Revenue", unit: "multiple", periodicity: "fiscal_year" },
    { metricKey: "ev_ebitda", family: "Valuation Multiples", displayName: "EV / EBITDA", unit: "multiple", periodicity: "fiscal_year" },
    { metricKey: "pe_ratio", family: "Valuation Multiples", displayName: "P/E Ratio", unit: "multiple", periodicity: "fiscal_year" },
    { metricKey: "price_book", family: "Valuation Multiples", displayName: "Price / Book", unit: "multiple", periodicity: "point_in_time" },
    { metricKey: "lfcf_multiple", family: "Valuation Multiples", displayName: "LFCF Multiple", unit: "multiple", periodicity: "fiscal_year" },
    { metricKey: "revenue", family: "Absolute Financials", displayName: "Revenue", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "ebitda", family: "Absolute Financials", displayName: "EBITDA", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "ebit", family: "Absolute Financials", displayName: "EBIT", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "eps", family: "Absolute Financials", displayName: "EPS", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "cfo", family: "Absolute Financials", displayName: "Cash from Operations", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "capex", family: "Absolute Financials", displayName: "Capital Expenditures", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "levered_fcf", family: "Absolute Financials", displayName: "Levered FCF", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "net_income", family: "Absolute Financials", displayName: "Net Income", unit: "currency", periodicity: "fiscal_year" },
    { metricKey: "cash", family: "Absolute Financials", displayName: "Cash & Equivalents", unit: "currency", periodicity: "point_in_time" },
    { metricKey: "debt", family: "Absolute Financials", displayName: "Total Debt", unit: "currency", periodicity: "point_in_time" },
    { metricKey: "revenue_growth", family: "Operating Metrics", displayName: "Revenue Growth", unit: "percent", periodicity: "derived" },
    { metricKey: "gross_margin", family: "Operating Metrics", displayName: "Gross Margin", unit: "percent", periodicity: "fiscal_year" },
    { metricKey: "ebitda_margin", family: "Operating Metrics", displayName: "EBITDA Margin", unit: "percent", periodicity: "fiscal_year" },
    { metricKey: "fcf_margin", family: "Operating Metrics", displayName: "FCF Margin", unit: "percent", periodicity: "fiscal_year" },
    { metricKey: "rule_of_40", family: "Operating Metrics", displayName: "Rule of 40", unit: "ratio", periodicity: "derived" },
    { metricKey: "payback_period", family: "Operating Metrics", displayName: "Payback Period", unit: "ratio", periodicity: "derived" },
  ];

  for (const m of metrics) {
    await prisma.metricCatalog.upsert({
      where: { metricKey: m.metricKey },
      update: { family: m.family, displayName: m.displayName, unit: m.unit, periodicity: m.periodicity },
      create: m,
    });
  }
  console.log(`  Seeded ${metrics.length} metric catalog entries`);

  // ─── b) Sections ────────────────────────────────────────────────────
  const sections = [
    { sectionKey: "saas_high_growth", displayName: "SaaS High Growth", description: "High-growth SaaS companies with >30% revenue growth", sortOrder: 1 },
    { sectionKey: "saas_rule_of_40", displayName: "SaaS Rule of 40", description: "SaaS companies evaluated on Rule of 40 efficiency", sortOrder: 2 },
    { sectionKey: "ebitda_dollar_bucket", displayName: "EBITDA $ Bucket", description: "Companies grouped by absolute EBITDA dollar amount", sortOrder: 3 },
    { sectionKey: "ebitda_margin_bucket", displayName: "EBITDA Margin Bucket", description: "Companies grouped by EBITDA margin percentage", sortOrder: 4 },
    { sectionKey: "sapphire_public_holdings", displayName: "Sapphire Public Holdings", description: "Sapphire Ventures public portfolio holdings", sortOrder: 5 },
    { sectionKey: "infra_dev", displayName: "Infra & Dev", description: "Infrastructure and developer tools companies", sortOrder: 6 },
    { sectionKey: "biz_apps", displayName: "Biz Apps", description: "Business applications and productivity software", sortOrder: 7 },
    { sectionKey: "fintech", displayName: "FinTech", description: "Financial technology companies", sortOrder: 8 },
    { sectionKey: "healthtech", displayName: "HealthTech", description: "Healthcare technology companies", sortOrder: 9 },
    { sectionKey: "vertical_saas", displayName: "Vertical SaaS", description: "Industry-specific vertical SaaS companies", sortOrder: 10 },
    { sectionKey: "finance_comp_set", displayName: "Finance Comp Set", description: "Financial comparables set for benchmarking", sortOrder: 11 },
  ];

  const sectionMap: Record<string, number> = {};
  for (const s of sections) {
    const result = await prisma.section.upsert({
      where: { sectionKey: s.sectionKey },
      update: { displayName: s.displayName, description: s.description, sortOrder: s.sortOrder },
      create: s,
    });
    sectionMap[s.sectionKey] = result.id;
  }
  console.log(`  Seeded ${sections.length} sections`);

  // ─── c) Companies with metric data ─────────────────────────────────
  const asOfDate = new Date("2026-03-21");

  interface CompanySeed {
    ticker: string;
    name: string;
    sector: string;
    stockPrice: number;
    enterpriseValue: number;
    evRevenue: number;
    revenueGrowth: number;
    grossMargin: number;
    ebitdaMargin: number;
    fcfMargin: number;
    ruleOf40: number;
    sections: string[];
  }

  const companies: CompanySeed[] = [
    { ticker: "CRWD", name: "CrowdStrike Holdings", sector: "Infra/Dev", stockPrice: 412.50, enterpriseValue: 102000, evRevenue: 22.5, revenueGrowth: 28, grossMargin: 78, ebitdaMargin: 24, fcfMargin: 32, ruleOf40: 52, sections: ["infra_dev", "saas_high_growth", "saas_rule_of_40", "sapphire_public_holdings"] },
    { ticker: "SNOW", name: "Snowflake", sector: "Infra/Dev", stockPrice: 198.30, enterpriseValue: 68000, evRevenue: 18.2, revenueGrowth: 26, grossMargin: 73, ebitdaMargin: 8, fcfMargin: 18, ruleOf40: 34, sections: ["infra_dev", "saas_high_growth"] },
    { ticker: "DDOG", name: "Datadog", sector: "Infra/Dev", stockPrice: 155.80, enterpriseValue: 52000, evRevenue: 19.8, revenueGrowth: 24, grossMargin: 80, ebitdaMargin: 26, fcfMargin: 30, ruleOf40: 50, sections: ["infra_dev", "saas_high_growth", "saas_rule_of_40"] },
    { ticker: "NET", name: "Cloudflare", sector: "Infra/Dev", stockPrice: 118.40, enterpriseValue: 42000, evRevenue: 20.5, revenueGrowth: 27, grossMargin: 77, ebitdaMargin: 12, fcfMargin: 16, ruleOf40: 39, sections: ["infra_dev", "saas_high_growth"] },
    { ticker: "ZS", name: "Zscaler", sector: "Infra/Dev", stockPrice: 245.60, enterpriseValue: 38000, evRevenue: 16.8, revenueGrowth: 25, grossMargin: 79, ebitdaMargin: 20, fcfMargin: 28, ruleOf40: 45, sections: ["infra_dev", "saas_high_growth", "saas_rule_of_40"] },
    { ticker: "MDB", name: "MongoDB", sector: "Infra/Dev", stockPrice: 285.20, enterpriseValue: 22000, evRevenue: 11.5, revenueGrowth: 18, grossMargin: 74, ebitdaMargin: 14, fcfMargin: 20, ruleOf40: 32, sections: ["infra_dev"] },
    { ticker: "PANW", name: "Palo Alto Networks", sector: "Infra/Dev", stockPrice: 198.50, enterpriseValue: 130000, evRevenue: 15.2, revenueGrowth: 15, grossMargin: 75, ebitdaMargin: 28, fcfMargin: 38, ruleOf40: 43, sections: ["infra_dev", "saas_rule_of_40", "ebitda_margin_bucket"] },
    { ticker: "FTNT", name: "Fortinet", sector: "Infra/Dev", stockPrice: 108.30, enterpriseValue: 82000, evRevenue: 13.8, revenueGrowth: 13, grossMargin: 79, ebitdaMargin: 34, fcfMargin: 36, ruleOf40: 47, sections: ["infra_dev", "saas_rule_of_40", "ebitda_margin_bucket"] },
    { ticker: "ABNB", name: "Airbnb", sector: "Biz Apps", stockPrice: 172.90, enterpriseValue: 108000, evRevenue: 9.2, revenueGrowth: 12, grossMargin: 82, ebitdaMargin: 35, fcfMargin: 42, ruleOf40: 47, sections: ["biz_apps", "saas_rule_of_40", "ebitda_margin_bucket", "ebitda_dollar_bucket"] },
    { ticker: "SHOP", name: "Shopify", sector: "Biz Apps", stockPrice: 115.70, enterpriseValue: 148000, evRevenue: 16.5, revenueGrowth: 22, grossMargin: 50, ebitdaMargin: 18, fcfMargin: 20, ruleOf40: 40, sections: ["biz_apps", "saas_rule_of_40"] },
    { ticker: "BILL", name: "BILL Holdings", sector: "FinTech", stockPrice: 82.40, enterpriseValue: 8500, evRevenue: 5.8, revenueGrowth: 14, grossMargin: 82, ebitdaMargin: 10, fcfMargin: 15, ruleOf40: 24, sections: ["fintech", "finance_comp_set"] },
    { ticker: "HUBS", name: "HubSpot", sector: "Biz Apps", stockPrice: 725.00, enterpriseValue: 38000, evRevenue: 14.2, revenueGrowth: 19, grossMargin: 84, ebitdaMargin: 18, fcfMargin: 24, ruleOf40: 37, sections: ["biz_apps", "saas_rule_of_40"] },
    { ticker: "VEEV", name: "Veeva Systems", sector: "HealthTech", stockPrice: 235.80, enterpriseValue: 38500, evRevenue: 14.8, revenueGrowth: 14, grossMargin: 74, ebitdaMargin: 38, fcfMargin: 40, ruleOf40: 52, sections: ["healthtech", "vertical_saas", "saas_rule_of_40", "ebitda_margin_bucket"] },
    { ticker: "WDAY", name: "Workday", sector: "Biz Apps", stockPrice: 275.40, enterpriseValue: 74000, evRevenue: 9.5, revenueGrowth: 16, grossMargin: 76, ebitdaMargin: 26, fcfMargin: 30, ruleOf40: 42, sections: ["biz_apps", "saas_rule_of_40", "ebitda_dollar_bucket"] },
    { ticker: "NOW", name: "ServiceNow", sector: "Biz Apps", stockPrice: 985.00, enterpriseValue: 210000, evRevenue: 17.5, revenueGrowth: 22, grossMargin: 81, ebitdaMargin: 30, fcfMargin: 34, ruleOf40: 52, sections: ["biz_apps", "saas_high_growth", "saas_rule_of_40", "ebitda_dollar_bucket"] },
    { ticker: "TEAM", name: "Atlassian", sector: "Infra/Dev", stockPrice: 285.60, enterpriseValue: 75000, evRevenue: 15.0, revenueGrowth: 20, grossMargin: 83, ebitdaMargin: 16, fcfMargin: 28, ruleOf40: 36, sections: ["infra_dev", "biz_apps"] },
    { ticker: "OKTA", name: "Okta", sector: "Infra/Dev", stockPrice: 112.50, enterpriseValue: 18000, evRevenue: 7.2, revenueGrowth: 14, grossMargin: 76, ebitdaMargin: 15, fcfMargin: 22, ruleOf40: 29, sections: ["infra_dev"] },
    { ticker: "ZM", name: "Zoom Video Communications", sector: "Biz Apps", stockPrice: 78.90, enterpriseValue: 17500, evRevenue: 3.8, revenueGrowth: 3, grossMargin: 78, ebitdaMargin: 36, fcfMargin: 38, ruleOf40: 39, sections: ["biz_apps", "ebitda_margin_bucket"] },
    { ticker: "TWLO", name: "Twilio", sector: "Infra/Dev", stockPrice: 118.20, enterpriseValue: 20000, evRevenue: 4.5, revenueGrowth: 8, grossMargin: 52, ebitdaMargin: 14, fcfMargin: 16, ruleOf40: 22, sections: ["infra_dev"] },
    { ticker: "SQ", name: "Block (Square)", sector: "FinTech", stockPrice: 82.50, enterpriseValue: 52000, evRevenue: 7.8, revenueGrowth: 14, grossMargin: 36, ebitdaMargin: 16, fcfMargin: 12, ruleOf40: 30, sections: ["fintech", "finance_comp_set"] },
    { ticker: "COIN", name: "Coinbase Global", sector: "FinTech", stockPrice: 265.00, enterpriseValue: 62000, evRevenue: 12.5, revenueGrowth: 30, grossMargin: 86, ebitdaMargin: 40, fcfMargin: 35, ruleOf40: 70, sections: ["fintech", "saas_high_growth", "saas_rule_of_40", "finance_comp_set"] },
    { ticker: "HOOD", name: "Robinhood Markets", sector: "FinTech", stockPrice: 48.70, enterpriseValue: 42000, evRevenue: 14.8, revenueGrowth: 35, grossMargin: 88, ebitdaMargin: 30, fcfMargin: 25, ruleOf40: 65, sections: ["fintech", "saas_high_growth", "finance_comp_set"] },
    { ticker: "AFRM", name: "Affirm Holdings", sector: "FinTech", stockPrice: 62.30, enterpriseValue: 18500, evRevenue: 6.2, revenueGrowth: 32, grossMargin: 60, ebitdaMargin: -4, fcfMargin: -2, ruleOf40: 28, sections: ["fintech", "saas_high_growth", "finance_comp_set"] },
    { ticker: "SOFI", name: "SoFi Technologies", sector: "FinTech", stockPrice: 14.80, enterpriseValue: 16000, evRevenue: 5.8, revenueGrowth: 22, grossMargin: 58, ebitdaMargin: 8, fcfMargin: 6, ruleOf40: 30, sections: ["fintech", "finance_comp_set"] },
    { ticker: "PAYC", name: "Paycom Software", sector: "Biz Apps", stockPrice: 218.50, enterpriseValue: 12500, evRevenue: 7.0, revenueGrowth: 10, grossMargin: 86, ebitdaMargin: 38, fcfMargin: 30, ruleOf40: 48, sections: ["biz_apps", "vertical_saas", "saas_rule_of_40", "ebitda_margin_bucket"] },
    { ticker: "TTD", name: "The Trade Desk", sector: "Biz Apps", stockPrice: 115.40, enterpriseValue: 56000, evRevenue: 21.0, revenueGrowth: 24, grossMargin: 81, ebitdaMargin: 32, fcfMargin: 35, ruleOf40: 56, sections: ["biz_apps", "saas_high_growth", "saas_rule_of_40"] },
    { ticker: "U", name: "Unity Technologies", sector: "Infra/Dev", stockPrice: 28.50, enterpriseValue: 12000, evRevenue: 5.5, revenueGrowth: 10, grossMargin: 68, ebitdaMargin: 2, fcfMargin: 5, ruleOf40: 12, sections: ["infra_dev"] },
    { ticker: "DOCN", name: "DigitalOcean Holdings", sector: "Infra/Dev", stockPrice: 42.80, enterpriseValue: 4200, evRevenue: 5.8, revenueGrowth: 12, grossMargin: 62, ebitdaMargin: 28, fcfMargin: 22, ruleOf40: 34, sections: ["infra_dev"] },
    { ticker: "GTLB", name: "GitLab", sector: "Infra/Dev", stockPrice: 62.50, enterpriseValue: 10500, evRevenue: 13.2, revenueGrowth: 26, grossMargin: 90, ebitdaMargin: 4, fcfMargin: 12, ruleOf40: 30, sections: ["infra_dev", "saas_high_growth", "sapphire_public_holdings"] },
    { ticker: "MNDY", name: "monday.com", sector: "Biz Apps", stockPrice: 310.00, enterpriseValue: 16000, evRevenue: 15.5, revenueGrowth: 28, grossMargin: 88, ebitdaMargin: 14, fcfMargin: 22, ruleOf40: 42, sections: ["biz_apps", "saas_high_growth", "saas_rule_of_40", "sapphire_public_holdings"] },
  ];

  const companyIdMap: Record<string, number> = {};

  for (const c of companies) {
    const company = await prisma.company.upsert({
      where: { ticker: c.ticker },
      update: { name: c.name, sector: c.sector },
      create: { ticker: c.ticker, name: c.name, sector: c.sector },
    });
    companyIdMap[c.ticker] = company.id;

    // Seed metric values for this company
    const metricEntries: { metricKey: string; periodKey: string; numericValue: number }[] = [
      { metricKey: "stock_price", periodKey: "CURRENT", numericValue: c.stockPrice },
      { metricKey: "enterprise_value", periodKey: "CURRENT", numericValue: c.enterpriseValue },
      { metricKey: "ev_revenue", periodKey: "NTM", numericValue: c.evRevenue },
      { metricKey: "revenue_growth", periodKey: "NTM", numericValue: c.revenueGrowth },
      { metricKey: "gross_margin", periodKey: "NTM", numericValue: c.grossMargin },
      { metricKey: "ebitda_margin", periodKey: "NTM", numericValue: c.ebitdaMargin },
      { metricKey: "fcf_margin", periodKey: "NTM", numericValue: c.fcfMargin },
      { metricKey: "rule_of_40", periodKey: "NTM", numericValue: c.ruleOf40 },
    ];

    for (const mv of metricEntries) {
      await prisma.metricValue.upsert({
        where: {
          companyId_metricKey_periodKey_asOfDate: {
            companyId: company.id,
            metricKey: mv.metricKey,
            periodKey: mv.periodKey,
            asOfDate,
          },
        },
        update: { numericValue: mv.numericValue },
        create: {
          companyId: company.id,
          metricKey: mv.metricKey,
          periodKey: mv.periodKey,
          numericValue: mv.numericValue,
          asOfDate,
        },
      });
    }
  }
  console.log(`  Seeded ${companies.length} companies with metric values`);

  // ─── d) Section memberships ─────────────────────────────────────────
  let membershipCount = 0;
  for (const c of companies) {
    const companyId = companyIdMap[c.ticker];
    for (const sectionKey of c.sections) {
      const sectionId = sectionMap[sectionKey];
      if (!sectionId) continue;
      await prisma.sectionMembership.upsert({
        where: {
          companyId_sectionId: { companyId, sectionId },
        },
        update: {},
        create: { companyId, sectionId, sortOrder: 0 },
      });
      membershipCount++;
    }
  }
  console.log(`  Seeded ${membershipCount} section memberships`);

  // ─── e) Historical snapshots: EV/NTM Revenue by cohort ─────────────
  const cohorts: { seriesKey: string; baseValue: number; range: number }[] = [
    { seriesKey: "hyper_growth", baseValue: 15.0, range: 3.0 },
    { seriesKey: "high_growth", baseValue: 10.0, range: 2.0 },
    { seriesKey: "medium_growth", baseValue: 6.5, range: 1.5 },
    { seriesKey: "low_growth", baseValue: 4.0, range: 1.0 },
  ];

  const now = new Date("2026-03-21");
  let snapshotCount = 0;

  for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - weekOffset * 7);
    // Normalize to midnight UTC
    snapshotDate.setUTCHours(0, 0, 0, 0);

    for (const cohort of cohorts) {
      // Create a gentle upward trend with some noise
      const trendFactor = (12 - weekOffset) / 12; // 0 -> 1 over 12 weeks
      const noise = (Math.sin(weekOffset * 2.3 + cohort.baseValue) * 0.5);
      const value = parseFloat(
        (cohort.baseValue - cohort.range * 0.5 + cohort.range * trendFactor + noise).toFixed(2)
      );

      await prisma.historicalSnapshot.upsert({
        where: {
          snapshotDate_summaryFamily_seriesKey: {
            snapshotDate,
            summaryFamily: "ev_ntm_revenue_by_cohort",
            seriesKey: cohort.seriesKey,
          },
        },
        update: { value },
        create: {
          snapshotDate,
          summaryFamily: "ev_ntm_revenue_by_cohort",
          seriesKey: cohort.seriesKey,
          value,
        },
      });
      snapshotCount++;
    }
  }
  console.log(`  Seeded ${snapshotCount} EV/NTM revenue cohort snapshots`);

  // ─── f) Historical snapshots: Portfolio value ───────────────────────
  let portfolioCount = 0;
  for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - weekOffset * 7);
    snapshotDate.setUTCHours(0, 0, 0, 0);

    // Portfolio value trending from ~850M to ~1.05B with noise
    const trendFactor = (12 - weekOffset) / 12;
    const noise = Math.sin(weekOffset * 1.7) * 25;
    const value = parseFloat((850 + 200 * trendFactor + noise).toFixed(2));

    await prisma.historicalSnapshot.upsert({
      where: {
        snapshotDate_summaryFamily_seriesKey: {
          snapshotDate,
          summaryFamily: "portfolio_value",
          seriesKey: "total_value",
        },
      },
      update: { value },
      create: {
        snapshotDate,
        summaryFamily: "portfolio_value",
        seriesKey: "total_value",
        value,
      },
    });
    portfolioCount++;
  }
  console.log(`  Seeded ${portfolioCount} portfolio value snapshots`);

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
