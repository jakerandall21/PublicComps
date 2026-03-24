# Sapphire Public Comps Dashboard

Web-based SaaS comparables dashboard built for Sapphire Ventures. Replaces the manually maintained Excel workbook (~350 companies, ~226 metric columns) with an interactive web app featuring filterable comp tables, visualizations, and a CSV ingestion pipeline.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Database:** Prisma ORM + SQLite (swap to PostgreSQL by changing `datasource` in `schema.prisma`)
- **Charts:** Recharts (line, area, scatter)
- **Auth:** NextAuth.js with shared-password (CredentialsProvider)
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and edit as needed
cp .env.example .env

# Generate Prisma client, push schema, and seed sample data
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the access password set in `.env` (default: `sapphire2026`).

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma connection string (default: `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `NEXTAUTH_URL` | App URL (default: `http://localhost:3000`) |
| `SAPPHIRE_ACCESS_PASSWORD` | Shared access code for the team |

## Features

### Comp Tables

11 curated section views accessible from the sidebar:

- SaaS High Growth, SaaS Mid-Cap, Large Cap Software, Security, DevTools & Infrastructure, Data & Analytics, Fintech, eCommerce & Marketplace, Vertical SaaS, Sapphire Portfolio, All Companies

Each table includes:
- 20 columns across 6 groups (Trading, Capitalization, Valuation, Growth, Margins, Financials)
- Column group toggles to show/hide families
- Sortable columns with nulls pushed to bottom
- Ticker/name search filter
- Computed summary rows (Median, Mean, Top Quartile)

### Charts & Analytics

Four visualizations on the `/charts` page:

1. **EV/NTM Revenue by Growth Cohort** — Line chart tracking median multiples over time for Hyper (>30%), High (20-30%), Medium (15-20%), and Low (<15%) growth cohorts
2. **Portfolio Value Time Series** — Area chart of aggregate portfolio value over time
3. **EV/NTM Revenue vs. Growth** — Scatter plot colored by growth cohort
4. **EV/NTM Revenue vs. FCF Margin** — Scatter plot colored by growth cohort

### CSV Data Ingestion

Upload Capital IQ CSV exports at `/upload`. The parser expects:

| Column | Content |
|---|---|
| 1 | Ticker |
| 2 | Company Name |
| 3+ | Metric values with headers in `metricKey_periodKey` format |

Example headers: `ev_revenue_NTM`, `revenue_growth_CY2025E_CY2026E`, `gross_margin_NTM`

Each upload is logged with run ID, timestamp, row count, and status.

## Project Structure

```
prisma/
  schema.prisma          # 7-model normalized schema
  seed.ts                # Sample data (30 companies, 27 metrics, 11 sections)
src/
  app/
    api/
      companies/         # GET companies by section or search
      metrics/           # GET metrics with computed summaries
      sections/          # GET all sections
      snapshots/         # GET historical time series data
      upload/            # POST CSV ingestion
    charts/              # Charts & Analytics page
    dashboard/[section]/ # Dynamic comp table views
    login/               # Shared-password login
    upload/              # CSV upload page
  components/
    charts/              # EvNtmTimeSeries, PortfolioValueTimeSeries, ValuationScatter
    tables/              # CompTable
    Sidebar.tsx          # Navigation sidebar
    DashboardLayout.tsx  # Layout wrapper
    Providers.tsx        # NextAuth SessionProvider
  lib/
    auth.ts              # NextAuth configuration
    constants.ts         # Metric families, period keys, growth cohorts
    prisma.ts            # PrismaClient singleton
    utils.ts             # Formatting helpers, cohort classification
```

## Database Schema

Uses an Entity-Attribute-Value (EAV) pattern for flexible metric storage:

- **Company** — Ticker, name, exchange, sector
- **MetricCatalog** — Metric definitions (key, family, unit, periodicity)
- **MetricValue** — Individual data points (companyId, metricKey, periodKey, value, asOfDate)
- **Section / SectionMembership** — Curated groupings of companies
- **HistoricalSnapshot** — Time series aggregates for charts
- **IngestionLog** — Upload audit trail

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |
