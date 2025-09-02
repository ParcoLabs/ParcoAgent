// client/src/components/settings/SLAForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

export default function SLAForm() {
  const [form, setForm] = useState({
    leakHours: 4,
    noHeatHours: 6,
    normalHours: 48,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/sla", {
        method: "PUT",
        body: {
          rules: {
            leakHours: Number(form.leakHours),
            noHeatHours: Number(form.noHeatHours),
            normalHours: Number(form.normalHours),
          },
        },
      });
      setMsg("Saved!");
    } catch (e: any) {
      setMsg(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="block">
        <span className="text-sm text-gray-600">Water leak response (hours)</span>
        <input
          className="input mt-1"
          type="number"
          value={form.leakHours}
          onChange={(e) => setForm({ ...form, leakHours: Number(e.target.value) })}
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">No heat response (hours)</span>
        <input
          className="input mt-1"
          type="number"
          value={form.noHeatHours}
          onChange={(e) =>
            setForm({ ...form, noHeatHours: Number(e.target.value) })
          }
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm text-gray-600">
          Default (normal issues) response (hours)
        </span>
        <input
          className="input mt-1"
          type="number"
          value={form.normalHours}
          onChange={(e) =>
            setForm({ ...form, normalHours: Number(e.target.value) })
          }
        />
      </label>
      <div className="md:col-span-2 flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save SLA"}
        </button>
      </div>
    </form>
  );
}
