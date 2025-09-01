import React, { useState } from "react";
import { api } from "@/lib/api";

export default function PMProfileForm() {
  const [form, setForm] = useState({ company: "", phone: "", tz: "", sms: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/profile", { method: "PUT", body: form });
      setMsg("Saved!");
    } catch (e:any) {
      setMsg(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={(e) => { e.preventDefault(); void save(); }}
    >
      <input className="input" placeholder="Company name" required
        value={form.company} onChange={e=>setForm({...form, company:e.target.value})}/>
      <input className="input" placeholder="Contact phone"
        value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
      <select className="input" value={form.tz} onChange={e=>setForm({...form, tz:e.target.value})}>
        <option value="" disabled>Select timezone</option>
        <option>America/New_York</option>
        <option>America/Chicago</option>
        <option>America/Los_Angeles</option>
      </select>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.sms} onChange={e=>setForm({...form, sms:e.target.checked})}/>
        Enable SMS notifications
      </label>
      <div className="md:col-span-2 flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
