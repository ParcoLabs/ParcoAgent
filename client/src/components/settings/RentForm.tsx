// client/src/components/settings/RentForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

export default function RentForm() {
  const [form, setForm] = useState({
    dueDay: 1,
    lateFeePercent: 5,
    cadence: "3/5/7 days",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/rent", {
        method: "PUT",
        body: {
          dueDay: Number(form.dueDay),
          lateFeePercent: Number(form.lateFeePercent),
          reminderCadence: form.cadence,
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
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <button type="button" className="btn-outline">Connect Stripe</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Rent due day</span>
          <input
            className="input mt-1"
            type="number"
            min={1}
            max={28}
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Late fee (%)</span>
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={form.lateFeePercent}
            onChange={(e) =>
              setForm({ ...form, lateFeePercent: Number(e.target.value) })
            }
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Reminder cadence</span>
          <select
            className="input mt-1"
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value })}
          >
            <option>3/5/7 days</option>
            <option>1/3/5 days</option>
            <option>Custom</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Rent Settings"}
        </button>
      </div>
    </form>
  );
}
