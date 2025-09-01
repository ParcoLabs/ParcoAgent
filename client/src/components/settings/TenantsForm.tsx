// client/src/components/settings/TenantsForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

type Row = {
  name: string;
  unit: string;
  lease_start?: string;
  lease_end?: string;
  rent?: number;
  email?: string;
  phone?: string;
};

export default function TenantsForm() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function parseCsv(text: string): Row[] {
    // naive CSV: split by lines, commas; handles basic values
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows: Row[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(",").map((c) => c.trim());
      const obj: any = {};
      header.forEach((h, idx) => {
        obj[h] = cols[idx] ?? "";
      });
      if (obj.rent !== undefined && obj.rent !== "") obj.rent = Number(obj.rent);
      rows.push(obj as Row);
    }
    return rows;
  }

  async function importCsv() {
    if (!file) {
      setMsg("Please select a CSV file first.");
      return;
    }
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const result = await api<{ inserted: number; errors: number }>(
        "/settings/tenants/import",
        { method: "POST", body: { rows } }
      );
      setMsg(`Imported ${result.inserted} tenants. Errors: ${result.errors}.`);
    } catch (e: any) {
      setMsg(e.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-4">
        <p className="text-gray-600 mb-2">
          Upload tenants CSV with headers: name, unit, lease_start, lease_end, rent, email, phone
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <div className="flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button
          type="button"
          className="btn-primary"
          onClick={() => void importCsv()}
          disabled={importing}
        >
          {importing ? "Importing…" : "Import Tenants"}
        </button>
      </div>
    </div>
  );
}
