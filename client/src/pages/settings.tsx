import React from "react";
import { Link } from "react-router-dom";
import Sidebar from "@/components/dashboard/sidebar";
import {
  SectionCard,
  PMProfileForm,
  PropertyForm,
  TenantsForm,
  ChannelsForm,
  VendorsForm,
  SLAForm,
  RentForm,
} from "@/components/settings";
import { useDemoReset, useIngestEmail, useIngestSms } from "@/lib/hooks";
import { apiEmailDailyBrief, api } from "@/lib/api";
import { ArrowLeft, Mail, MessageSquare, RotateCcw, Link2 } from "lucide-react";

/* ------------------ lightweight toast ------------------ */
function useToasts() {
  const [toasts, setToasts] = React.useState<Array<{ id: number; kind: "success" | "error"; msg: string }>>([]);
  const add = React.useCallback((kind: "success" | "error", msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return { toasts, add };
}
function ToastRack({ toasts }: { toasts: Array<{ id: number; kind: "success" | "error"; msg: string }> }) {
  return (
    <div className="fixed top-3 right-3 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-3 py-2 text-sm shadow-md ${
            t.kind === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const { toasts, add } = useToasts();

  /* ------------------ hooks ------------------ */
  const demoReset = useDemoReset({
    onSuccess: () => add("success", "Demo data reset"),
    onError: (e: any) => add("error", e?.message || "Reset failed"),
  });

  // Redirect helper
  function deepLinkToRequest(res: any, src: "email" | "sms") {
    const id = res?.request?.id || res?.id || res?.requestId;
    if (id) {
      window.location.href = `/requests?select=${encodeURIComponent(String(id))}`;
    } else {
      add("error", `Ingest (${src}) succeeded but did not return an id`);
    }
  }

  const ingestEmail = useIngestEmail({
    onSuccess: (res: any) => {
      add("success", "Email ingested — request created");
      deepLinkToRequest(res, "email");
    },
    onError: (e: any) => add("error", e?.message || "Email ingest failed"),
  });

  const ingestSms = useIngestSms({
    onSuccess: (res: any) => {
      add("success", "SMS ingested — request created");
      deepLinkToRequest(res, "sms");
    },
    onError: (e: any) => add("error", e?.message || "SMS ingest failed"),
  });

  const [briefTo, setBriefTo] = React.useState("");
  const [briefSending, setBriefSending] = React.useState(false);
  async function sendBrief() {
    if (!briefTo) return;
    try {
      setBriefSending(true);
      await apiEmailDailyBrief(briefTo);
      add("success", "Daily Brief email queued");
      setBriefTo("");
    } catch (e: any) {
      add("error", e?.message || "Failed to send brief");
    } finally {
      setBriefSending(false);
    }
  }

  /* ------------------ ingest form state ------------------ */
  // Email
  const [emailFrom, setEmailFrom] = React.useState("alicia@example.com");
  const [emailSubject, setEmailSubject] = React.useState("Toilet running");
  const [emailText, setEmailText] = React.useState("Water keeps flowing after each flush.");
  const [emailProperty, setEmailProperty] = React.useState("Maple Grove Apts #3B");
  const [emailTenant, setEmailTenant] = React.useState("Alicia Gomez");
  const [emailCategory, setEmailCategory] = React.useState("Plumbing");
  const [emailPriority, setEmailPriority] = React.useState("High");

  // SMS
  const [smsFrom, setSmsFrom] = React.useState("+15551234567");
  const [smsText, setSmsText] = React.useState("AC not cooling; thermostat reads 85");
  const [smsProperty, setSmsProperty] = React.useState("Oak Ridge #204");
  const [smsTenant, setSmsTenant] = React.useState("Marcus Lee");
  const [smsCategory, setSmsCategory] = React.useState("HVAC");
  const [smsPriority, setSmsPriority] = React.useState("Urgent");

  function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    ingestEmail.mutate({
      from: emailFrom,
      subject: emailSubject,
      text: emailText,
      property: emailProperty,
      tenantName: emailTenant,
      category: emailCategory,
      priority: emailPriority,
    });
  }

  function onSubmitSms(e: React.FormEvent) {
    e.preventDefault();
    ingestSms.mutate({
      from: smsFrom,
      text: smsText,
      property: smsProperty,
      tenantName: smsTenant,
      category: smsCategory,
      priority: smsPriority,
    });
  }

  /* ------------------ Connectors local state (demo) ------------------ */
  const [postmarkInboundUrl, setPostmarkInboundUrl] = React.useState("");
  const [postmarkInboundToken, setPostmarkInboundToken] = React.useState("");
  const [twilioSid, setTwilioSid] = React.useState("");
  const [twilioToken, setTwilioToken] = React.useState("");
  const [twilioNumber, setTwilioNumber] = React.useState("");

  async function saveConnectors(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/settings", {
        method: "PATCH",
        body: {
          channels: {
            email: { provider: "postmark", inboundUrl: postmarkInboundUrl || null, inboundToken: postmarkInboundToken || null },
            sms: { provider: "twilio", sid: twilioSid || null, token: twilioToken || null, from: twilioNumber || null },
          },
        },
      });
      add("success", "Channels saved");
    } catch (err: any) {
      add("error", err?.message || "Failed to save channels");
    }
  }

  const emailWebhook = `${location.origin.replace(/\/$/, "")}/api/webhooks/email`;
  const smsWebhook = `${location.origin.replace(/\/$/, "")}/api/webhooks/sms`;

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      <ToastRack toasts={toasts} />

      {/* Sidebar */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-600">Org profile, channels & limits.</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title="PM Profile">
              <PMProfileForm />
            </SectionCard>

            <SectionCard title="Properties">
              <PropertyForm />
            </SectionCard>

            <SectionCard title="Tenants">
              <TenantsForm />
            </SectionCard>

            {/* Channels (existing form stays) */}
            <SectionCard title="Channels">
              <ChannelsForm />
            </SectionCard>

            {/* NEW: Connectors (Email & SMS) */}
            <SectionCard title="Connectors (Email & SMS)">
              <form onSubmit={saveConnectors} className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <Link2 className="h-4 w-4" />
                    Email — Postmark inbound
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Inbound Webhook URL">
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={postmarkInboundUrl}
                        onChange={(e) => setPostmarkInboundUrl(e.target.value)}
                        placeholder="https://example.com/inbound"
                      />
                    </Field>
                    <Field label="Inbound Token">
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={postmarkInboundToken}
                        onChange={(e) => setPostmarkInboundToken(e.target.value)}
                        placeholder="pm-inbound-token"
                      />
                    </Field>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Set your provider to POSTMARK and point it to:
                    <div className="font-mono mt-1 select-all">{emailWebhook}</div>
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <Link2 className="h-4 w-4" />
                    SMS — Twilio
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Account SID">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} />
                    </Field>
                    <Field label="Auth Token">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} />
                    </Field>
                    <Field label="From Number">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={twilioNumber} onChange={(e) => setTwilioNumber(e.target.value)} placeholder="+15551234567" />
                    </Field>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Configure your Twilio Messaging webhook to:
                    <div className="font-mono mt-1 select-all">{smsWebhook}</div>
                  </div>
                </div>

                <div className="pt-1">
                  <button type="submit" className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                    Save Channels
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Vendors">
              <VendorsForm />
            </SectionCard>

            <SectionCard title="SLA Limits">
              <SLAForm />
            </SectionCard>

            <SectionCard title="Rent & Billing">
              <RentForm />
            </SectionCard>

            {/* Daily Brief helper */}
            <SectionCard title="Daily Brief (optional)">
              <div className="text-sm text-gray-600 mb-3">Send yourself a summary of open items and recent activity.</div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-md border px-3 py-2 text-sm flex-1"
                  placeholder="you@example.com"
                  value={briefTo}
                  onChange={(e) => setBriefTo(e.target.value)}
                />
                <button
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  onClick={sendBrief}
                  disabled={!briefTo || briefSending}
                >
                  <Mail className="h-4 w-4" />
                  {briefSending ? "Sending…" : "Send Brief"}
                </button>
              </div>
            </SectionCard>

            {/* DEV ONLY: Test Ingest */}
            {import.meta.env.DEV && (
              <SectionCard title="Test Ingest (dev only)">
                <p className="text-xs text-gray-600 mb-3">
                  These forms call the ingestion endpoints to create requests from Email or SMS. If the text/subject contains a token like
                  <code> REQ-1234</code>, the server links rather than creates.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Ingest */}
                  <form onSubmit={onSubmitEmail} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <Mail className="h-4 w-4" /> Email
                    </div>
                    <Field label="From">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="alicia@example.com" required />
                    </Field>
                    <Field label="Subject">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Toilet running" required />
                    </Field>
                    <Field label="Text">
                      <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={emailText} onChange={(e) => setEmailText(e.target.value)} placeholder="Describe the issue…" />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Property">
                        <input className="w-full rounded-md border px-3 py-2 text-sm" value={emailProperty} onChange={(e) => setEmailProperty(e.target.value)} placeholder="Maple Grove Apts #3B" />
                      </Field>
                      <Field label="Tenant">
                        <input className="w-full rounded-md border px-3 py-2 text-sm" value={emailTenant} onChange={(e) => setEmailTenant(e.target.value)} placeholder="Alicia Gomez" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Category">
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={emailCategory} onChange={(e) => setEmailCategory(e.target.value)}>
                          {["Plumbing", "Electrical", "HVAC", "Noise", "Other"].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={emailPriority} onChange={(e) => setEmailPriority(e.target.value)}>
                          {["Low", "Medium", "High", "Urgent"].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                        disabled={ingestEmail.isPending}
                        title="Create a request via Email ingest"
                      >
                        {ingestEmail.isPending ? "Submitting…" : "Submit Email"}
                      </button>
                    </div>
                  </form>

                  {/* SMS Ingest */}
                  <form onSubmit={onSubmitSms} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <MessageSquare className="h-4 w-4" /> SMS
                    </div>
                    <Field label="From">
                      <input className="w-full rounded-md border px-3 py-2 text-sm" value={smsFrom} onChange={(e) => setSmsFrom(e.target.value)} placeholder="+15551234567" required />
                    </Field>
                    <Field label="Text">
                      <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="Describe the issue…" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Property">
                        <input className="w-full rounded-md border px-3 py-2 text-sm" value={smsProperty} onChange={(e) => setSmsProperty(e.target.value)} placeholder="Oak Ridge #204" />
                      </Field>
                      <Field label="Tenant">
                        <input className="w-full rounded-md border px-3 py-2 text-sm" value={smsTenant} onChange={(e) => setSmsTenant(e.target.value)} placeholder="Marcus Lee" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Category">
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={smsCategory} onChange={(e) => setSmsCategory(e.target.value)}>
                          {["Plumbing", "Electrical", "HVAC", "Noise", "Other"].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={smsPriority} onChange={(e) => setSmsPriority(e.target.value)}>
                          {["Low", "Medium", "High", "Urgent"].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                        disabled={ingestSms.isPending}
                        title="Create a request via SMS ingest"
                      >
                        {ingestSms.isPending ? "Submitting…" : "Submit SMS"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Tip: If your message contains an ID like <code>REQ-1001</code>, the server will link to that request instead of creating a new one.
                </div>
              </SectionCard>
            )}

            {/* Demo reset helper */}
            <SectionCard title="Demo Tools">
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  onClick={() => demoReset.mutate()}
                  disabled={demoReset.isPending}
                  title="Reset demo data"
                >
                  <RotateCcw className="h-4 w-4" />
                  {demoReset.isPending ? "Resetting…" : "Reset Demo Data"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Resets requests, jobs, properties, prospects, agent drafts and audit log to the seeded state.</p>
            </SectionCard>
          </div>
        </main>
      </div>
    </div>
  );
}
