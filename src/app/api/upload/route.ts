import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";

export async function POST(request: NextRequest) {
  let ingestionLog;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No CSV file provided. Upload a file with the field name 'file'." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    // Parse CSV
    const records: string[][] = parse(csvText, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (records.length < 2) {
      return NextResponse.json(
        { error: "CSV must contain a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headers = records[0];
    const dataRows = records.slice(1);
    const asOfDate = new Date();

    // Create ingestion log entry
    ingestionLog = await prisma.ingestionLog.create({
      data: {
        asOfDate,
        rowCount: dataRows.length,
        status: "running",
      },
    });

    // Column mapping: first column = ticker, second = company name
    // Remaining columns have headers in "metricKey_periodKey" format
    // e.g., "ev_revenue_CY2025E" -> metricKey = "ev_revenue", periodKey = "CY2025E"
    const columnMappings: Array<{ metricKey: string; periodKey: string }> = [];
    for (let i = 2; i < headers.length; i++) {
      const header = headers[i].trim();
      if (!header) continue;

      // Split on the last underscore to separate metricKey from periodKey
      // e.g., "ev_ntm_revenue_CY2025E" -> metricKey="ev_ntm_revenue", periodKey="CY2025E"
      const lastUnderscoreIdx = header.lastIndexOf("_");
      if (lastUnderscoreIdx === -1) {
        // No underscore found; treat entire header as metricKey with "LATEST" periodKey
        columnMappings.push({ metricKey: header, periodKey: "LATEST" });
      } else {
        const metricKey = header.substring(0, lastUnderscoreIdx);
        const periodKey = header.substring(lastUnderscoreIdx + 1);
        columnMappings.push({ metricKey, periodKey });
      }
    }

    let companiesProcessed = 0;
    let metricsLoaded = 0;

    for (const row of dataRows) {
      const ticker = row[0]?.trim();
      const name = row[1]?.trim();

      if (!ticker) continue;

      // Upsert company by ticker
      const company = await prisma.company.upsert({
        where: { ticker },
        update: { name: name || ticker, updatedAt: new Date() },
        create: { ticker, name: name || ticker },
      });
      companiesProcessed++;

      // Process each metric column
      for (let i = 0; i < columnMappings.length; i++) {
        const cellIndex = i + 2;
        const rawValue = row[cellIndex]?.trim();
        const { metricKey, periodKey } = columnMappings[i];

        if (!rawValue && rawValue !== "0") continue;

        // Try to parse as number
        const cleaned = rawValue.replace(/[,%$]/g, "");
        const numericValue = parseFloat(cleaned);
        const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

        // Ensure MetricCatalog entry exists
        await prisma.metricCatalog.upsert({
          where: { metricKey },
          update: {},
          create: {
            metricKey,
            family: metricKey.split("_")[0] || "general",
            displayName: metricKey.replace(/_/g, " "),
            unit: rawValue.includes("%") ? "percent" : "currency",
            periodicity: "point_in_time",
          },
        });

        // Upsert MetricValue
        await prisma.metricValue.upsert({
          where: {
            companyId_metricKey_periodKey_asOfDate: {
              companyId: company.id,
              metricKey,
              periodKey,
              asOfDate,
            },
          },
          update: {
            numericValue: isNumeric ? numericValue : null,
            rawExcelError: isNumeric ? null : rawValue,
            ingestionId: ingestionLog.id,
          },
          create: {
            companyId: company.id,
            metricKey,
            periodKey,
            numericValue: isNumeric ? numericValue : null,
            rawExcelError: isNumeric ? null : rawValue,
            asOfDate,
            ingestionId: ingestionLog.id,
          },
        });
        metricsLoaded++;
      }
    }

    // Update ingestion log to completed
    await prisma.ingestionLog.update({
      where: { id: ingestionLog.id },
      data: { status: "completed" },
    });

    return NextResponse.json({
      success: true,
      companiesProcessed,
      metricsLoaded,
    });
  } catch (error) {
    console.error("Error processing CSV upload:", error);

    // Mark ingestion as failed if it was created
    if (ingestionLog) {
      await prisma.ingestionLog.update({
        where: { id: ingestionLog.id },
        data: {
          status: "failed",
          errorMsg: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return NextResponse.json(
      {
        error: "Failed to process CSV upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
