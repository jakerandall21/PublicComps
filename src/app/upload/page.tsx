"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UploadResult {
  companiesProcessed: number;
  metricsLoaded: number;
  ingestionId: string;
}

interface IngestionLogEntry {
  id: number;
  runId: string;
  startedAt: string;
  asOfDate: string;
  rowCount: number;
  status: string;
  errorMsg: string | null;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<IngestionLogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch("/api/upload?logs=true");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      // silently fail - logs are not critical
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    } else {
      setError("Please upload a CSV file.");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setProgress(100);
      setResult({
        companiesProcessed: data.companiesProcessed ?? 0,
        metricsLoaded: data.metricsLoaded ?? 0,
        ingestionId: data.ingestionId ?? "",
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchLogs();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Ingestion</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload CSV data to populate company metrics and comparables.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Upload CSV
          </h2>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-2">
              <svg
                className={`mx-auto h-12 w-12 ${isDragging ? "text-blue-500" : file ? "text-green-500" : "text-gray-400"}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m0 0v4a4 4 0 004 4h20a4 4 0 004-4V28m-8-20l8 8m-8-8v8h8"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {file ? (
                <p className="text-sm text-green-700 font-medium">
                  {file.name}{" "}
                  <span className="text-green-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">
                      Click to select
                    </span>{" "}
                    or drag and drop a CSV file
                  </p>
                  <p className="text-xs text-gray-400">CSV files only</p>
                </>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !file || uploading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              }`}
            >
              {uploading ? "Uploading..." : "Upload & Process"}
            </button>
            {file && !uploading && (
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {progress < 100
                  ? "Processing..."
                  : "Complete!"}
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-800">
                Upload Successful
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {result.companiesProcessed}
                  </p>
                  <p className="text-xs text-green-600">Companies Processed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {result.metricsLoaded}
                  </p>
                  <p className="text-xs text-green-600">Metrics Loaded</p>
                </div>
              </div>
              {result.ingestionId && (
                <p className="mt-2 text-xs text-green-500">
                  Ingestion ID: {result.ingestionId}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800">
                Upload Failed
              </h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Instructions Card */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            CSV Format
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Upload a CSV export from Capital IQ or the Comps Input sheet.
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  <strong>First column:</strong> Ticker
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  <strong>Second column:</strong> Company Name
                </span>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  <strong>Remaining columns:</strong> metric values with headers
                  in <code className="bg-gray-100 px-1 rounded text-xs">metricKey_periodKey</code> format
                </span>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 rounded-md p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Example headers:
              </p>
              <code className="text-xs text-blue-700 block leading-relaxed">
                ev_revenue_NTM
                <br />
                revenue_growth_CY2025E_CY2026E
                <br />
                gross_margin_NTM
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion Log Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Ingestion Log
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No ingestion runs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    Run ID
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    Started
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    As-of Date
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">
                    Rows
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">
                      {log.runId.slice(0, 12)}...
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(log.asOfDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {log.rowCount}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : log.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : log.status === "running"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-red-500 max-w-xs truncate">
                      {log.errorMsg || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
