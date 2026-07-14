"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function DownloadReportButton({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report?month=${encodeURIComponent(month)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not generate report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-report-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={download}
        disabled={loading}
        className="btn-ghost inline-flex items-center gap-2 text-sm"
      >
        <Download className="h-4 w-4" />
        {loading ? "Generating…" : "Download PDF"}
      </button>
      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
    </div>
  );
}
