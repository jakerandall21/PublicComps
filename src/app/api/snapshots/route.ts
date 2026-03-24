import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const family = searchParams.get("family");
    const seriesKeysParam = searchParams.get("seriesKeys");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!family) {
      return NextResponse.json(
        { error: "family query parameter is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      summaryFamily: family,
    };

    if (seriesKeysParam) {
      const seriesKeys = seriesKeysParam.split(",").map((k) => k.trim());
      where.seriesKey = { in: seriesKeys };
    }

    // Date range filter
    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) {
        where.snapshotDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.snapshotDate.lte = new Date(endDate);
      }
    }

    const snapshots = await prisma.historicalSnapshot.findMany({
      where,
      orderBy: { snapshotDate: "asc" },
    });

    // Group by seriesKey for chart consumption
    const grouped: Record<string, typeof snapshots> = {};
    for (const snapshot of snapshots) {
      if (!grouped[snapshot.seriesKey]) {
        grouped[snapshot.seriesKey] = [];
      }
      grouped[snapshot.seriesKey].push(snapshot);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
