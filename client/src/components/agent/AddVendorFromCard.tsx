// client/src/components/agent/AddVendorFromCard.tsx
import * as React from "react";
import { post } from "@/lib/api";

type OcrResult = {
  rawText: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: string;
  serviceArea?: string;
};

export default function AddVendorFromCard() {
  const [img, setImg] = React.useState<string | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [result, setResult] = React.useState<OcrResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const data = await fileToDataURL(f);
    setImg(data);
    setResult(null);
    setError(null);
    e.currentTarget.value = "";
  }

  async function runOcr() {
    if (!img) return;
    setExtracting(true);
    setError(null);
    try {
      // dynamic import so we don’t bloat initial bundle
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker({ logger: () => {} });
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      const { data } = await worker.recognize(img);
      await worker.terminate();
      const rawText = (data?.text || "").trim();
      const parsed = parseBusinessCard(rawText);
      setResult({ rawText, ...parsed });
      setToast("Text extracted. Review and save.");
    } catch (e: any) {
      setError(e?.message || "OCR failed. Try a clearer photo.");
    } finally {
      setExtracting(false);
    }
  }

  async function saveVendor() {
    if (!result) return;
    const payload = {
      name: result.name || result.company || "New Vendor",
      email: result.email || null,
      phone: result.phone || null,
      type: result.type || null,
      serviceArea: result.serviceArea || null,
    };
    setSaving(true);
    setError(null);
    try {
      await post("/settings/vendors", payload);
      setToast("Vendor added to directory.");
    } catch (e: any) {
      setError(e?.message || "Failed to add vendor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Add Vendor from Business Card</h3>
        {toast && <div className="text-sm text-emerald-700">{toast}</div>}
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-600 mb-1">Upload card photo</div>
          <input type="file" accept="image/*" onChange={pick} />
          {img && (
            <div className="mt-3">
              <img src={img} alt="card" className="max-h-48 rounded-lg border" />
            </div>
          )}
          <div className="mt-3">
            <button
              className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
              onClick={runOcr}
              disabled={!img || extracting}
            >
              {extracting ? "Extracting…" : "Extract Text"}
            </button>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>

        <div>
          <div className="text-xs text-slate-600 mb-1">Review & edit</div>
          <div className="grid grid-cols-1 gap-2">
            <TextField
              label="Name"
              value={result?.name || ""}
              onChange={(v) => setResult((r) => (r ? { ...r, name: v } : r))}
            />
            <TextField
              label="Company"
              value={result?.company || ""}
              onChange={(v) => setResult((r) => (r ? { ...r, company: v } : r))}
            />
            <TextField
              label="Email"
              value={result?.email || ""}
              onChange={(v) => setResult((r) => (r ? { ...r, email: v } : r))}
            />
            <TextField
              label="Phone"
              value={result?.phone || ""}
              onChange={(v) => setResult((r) => (r ? { ...r, phone: v } : r))}
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Type"
                value={result?.type || ""}
                onChange={(v) => setResult((r) => (r ? { ...r, type: v } : r))}
              />
              <TextField
                label="Service Area"
                value={result?.serviceArea || ""}
                onChange={(v) => setResult((r) => (r ? { ...r, serviceArea: v } : r))}
              />
            </div>
            <button
              className="mt-2 rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
              onClick={saveVendor}
              disabled={!result || saving}
            >
              {saving ? "Saving…" : "Add to Vendors"}
            </button>
          </div>
        </div>
      </div>

      {result?.rawText && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-slate-600">Show extracted text</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded border">{result.rawText}</pre>
        </details>
      )}
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        className="rounded-xl border border-gray-300 p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("file read error"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

function parseBusinessCard(text: string) {
  const t = text.replace(/\r/g, "").split("\n").map((s) => s.trim()).filter(Boolean);
  const joined = t.join(" ");

  const email = (joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  const phone = (joined.match(/(\+?\d[\d\s\-\(\)]{7,}\d)/) || [])[0]?.replace(/\s+/g, " ").trim();

  // naive name/company guess: first non-email, non-phone lines
  let name = "";
  let company = "";
  for (const line of t) {
    if (email && line.includes(email)) continue;
    if (phone && line.includes(phone)) continue;
    if (!name && /^[A-Za-z ,.'\-]+$/.test(line) && line.split(" ").length <= 4) {
      name = line;
      continue;
    }
    if (!company && /[A-Za-z0-9]/.test(line)) {
      company = line;
      break;
    }
  }

  // type/service area light guesses
  const lower = joined.toLowerCase();
  const type =
    (lower.match(/\b(plumbing|plumber|hvac|electrical|electrician|cleaning|roofing|painting|handyman)\b/) || [])[1] ||
    undefined;
  const serviceArea =
    (lower.match(/\b(nyc|new york|brooklyn|queens|bronx|manhattan|miami|austin|sf|san francisco)\b/) || [])[1] ||
    undefined;

  return { name, company, email, phone, type, serviceArea };
}
