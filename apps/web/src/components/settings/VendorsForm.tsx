// client/src/components/settings/VendorsForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

export default function VendorsForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "",
    serviceArea: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function addVendor() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/vendors", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          type: form.type || null,
          serviceArea: form.serviceArea || null,
        },
      });
      setMsg("Vendor added!");
      setForm({ name: "", email: "", phone: "", type: "", serviceArea: "" });
    } catch (e: any) {
      setMsg(e.message || "Failed to add vendor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void addVendor();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          placeholder="Vendor name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <select
          className="input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="">Type</option>
          <option>Plumber</option>
          <option>HVAC</option>
          <option>Electrician</option>
          <option>General</option>
        </select>
        <input
          className="input"
          placeholder="Service area (ZIP or city)"
          value={form.serviceArea}
          onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Adding…" : "Add Vendor"}
        </button>
      </div>
    </form>
  );
}
