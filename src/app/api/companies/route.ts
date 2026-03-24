import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");
    const search = searchParams.get("search");

    // Build the where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // If section is provided, fetch companies through SectionMembership join
    if (section) {
      where.sectionMemberships = {
        some: {
          section: {
            sectionKey: section,
          },
        },
      };
    }

    // If search is provided, filter by ticker or name (case insensitive)
    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        sectionMemberships: {
          include: {
            section: true,
          },
        },
      },
      orderBy: { ticker: "asc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
