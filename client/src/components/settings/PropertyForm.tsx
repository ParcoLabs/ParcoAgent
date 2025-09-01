// client/src/components/settings/PropertyForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

export default function PropertyForm() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    type: "",
    unitCount: "",
    rentCycle: "Monthly",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/property", {
        method: "PUT",
        body: {
          name: form.name,
          address: form.address,
          type: form.type || null,
          unitCount: form.unitCount ? Number(form.unitCount) : null,
          rentCycle: form.rentCycle,
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
      <input
        className="input"
        placeholder="Property name"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        className="input"
        placeholder="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          className="input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="">Type</option>
          <option>Single Family</option>
          <option>Multifamily</option>
          <option>Commercial</option>
        </select>
        <input
          className="input"
          placeholder="Unit count"
          type="number"
          value={form.unitCount}
          onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
        />
        <select
          className="input"
          value={form.rentCycle}
          onChange={(e) => setForm({ ...form, rentCycle: e.target.value })}
        >
          <option>Monthly</option>
          <option>Weekly</option>
          <option>Annual</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Property"}
        </button>
      </div>
    </form>
  );
}
