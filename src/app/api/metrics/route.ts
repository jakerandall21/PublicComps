import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeP75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = 0.75 * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdsParam = searchParams.get("companyIds");
    const metricKeysParam = searchParams.get("metricKeys");
    const periodKeysParam = searchParams.get("periodKeys");
    const section = searchParams.get("section");

    let companyIds: number[] = [];

    // If section is provided, resolve companyIds from SectionMembership
    if (section) {
      const memberships = await prisma.sectionMembership.findMany({
        where: {
          section: { sectionKey: section },
        },
        select: { companyId: true },
      });
      companyIds = memberships.map((m) => m.companyId);
    } else if (companyIdsParam) {
      companyIds = companyIdsParam
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
    }

    if (companyIds.length === 0) {
      return NextResponse.json({ data: {}, summaries: {} });
    }

    // Build the where clause for MetricValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      companyId: { in: companyIds },
    };

    if (metricKeysParam) {
      const metricKeys = metricKeysParam.split(",").map((k) => k.trim());
      where.metricKey = { in: metricKeys };
    }

    if (periodKeysParam) {
      const periodKeys = periodKeysParam.split(",").map((k) => k.trim());
      where.periodKey = { in: periodKeys };
    }

    const metricValues = await prisma.metricValue.findMany({
      where,
      orderBy: [{ companyId: "asc" }, { metricKey: "asc" }, { periodKey: "asc" }],
    });

    // Group results by companyId
    const data: Record<number, typeof metricValues> = {};
    for (const mv of metricValues) {
      if (!data[mv.companyId]) {
        data[mv.companyId] = [];
      }
      data[mv.companyId].push(mv);
    }

    // Compute summary statistics for each metricKey+periodKey combo
    const buckets: Record<string, number[]> = {};
    for (const mv of metricValues) {
      if (mv.numericValue == null) continue;
      const key = `${mv.metricKey}_${mv.periodKey}`;
      if (!buckets[key]) {
        buckets[key] = [];
      }
      buckets[key].push(mv.numericValue);
    }

    const summaries: Record<
      string,
      { median: number; mean: number; p75: number }
    > = {};
    for (const [key, values] of Object.entries(buckets)) {
      summaries[key] = {
        median: computeMedian(values),
        mean: computeMean(values),
        p75: computeP75(values),
      };
    }

    return NextResponse.json({ data, summaries });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
