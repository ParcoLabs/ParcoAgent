// client/src/components/settings/ChannelsForm.tsx
import React, { useState } from "react";
import { api } from "@/lib/api";

export default function ChannelsForm() {
  const [form, setForm] = useState({
    gmailConnected: false,
    smsConnected: false,
    portalEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/settings/channels", {
        method: "PUT",
        body: {
          gmail: { connected: form.gmailConnected },
          sms: { connected: form.smsConnected },
          portalEnabled: form.portalEnabled,
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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setForm((f) => ({ ...f, gmailConnected: !f.gmailConnected }))}
        >
          {form.gmailConnected ? "Gmail Connected ✓" : "Connect Gmail"}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setForm((f) => ({ ...f, smsConnected: !f.smsConnected }))}
        >
          {form.smsConnected ? "SMS Connected ✓" : "Connect SMS"}
        </button>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.portalEnabled}
          onChange={(e) =>
            setForm((f) => ({ ...f, portalEnabled: e.target.checked }))
          }
        />
        Enable in-app tenant portal
      </label>
      <div className="flex items-center justify-between">
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Channels"}
        </button>
      </div>
    </form>
  );
}
