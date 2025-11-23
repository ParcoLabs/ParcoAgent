import { useState } from "react";
import { useIngestEmail, useIngestSms } from "@/lib/hooks";
import { useToast } from "@/lib/use-toast";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export default function TestIngestCard() {
  const { toast } = useToast();

  // Email form state
  const [emailFrom, setEmailFrom] = useState("tenant@example.com");
  const [emailSubject, setEmailSubject] = useState("Toilet running in #3B");
  const [emailText, setEmailText] = useState("There is a continuous water sound. Please help.");
  const [emailProperty, setEmailProperty] = useState("12 Maple Ct");
  const [emailTenant, setEmailTenant] = useState("Alicia Keys");
  const [emailCategory, setEmailCategory] = useState("Plumbing");
  const [emailPriority, setEmailPriority] = useState("High");

  // SMS form state
  const [smsFrom, setSmsFrom] = useState("+15551234567");
  const [smsText, setSmsText] = useState("Sink leaking in 3B");
  const [smsProperty, setSmsProperty] = useState("12 Maple Ct");
  const [smsTenant, setSmsTenant] = useState("Alicia Keys");
  const [smsCategory, setSmsCategory] = useState("Plumbing");
  const [smsPriority, setSmsPriority] = useState("High");

  const ingestEmail = useIngestEmail();
  const ingestSms = useIngestSms();

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await ingestEmail.mutateAsync({
        from: emailFrom,
        subject: emailSubject,
        text: emailText,
        property: emailProperty,
        tenantName: emailTenant,
        category: emailCategory,
        priority: emailPriority,
      });
      // Expecting { id: string } or { requestId: string }
      const id = (res as any)?.id || (res as any)?.requestId;
      toast({ title: "Email ingested", description: "Request created from email." });
      if (id) {
        // deep-link to the request detail if your route uses /requests/:id
        window.location.href = `/requests?select=${encodeURIComponent(id)}`;
      }
    } catch (err: any) {
      toast({ title: "Ingestion failed", description: err?.message || "Error", variant: "destructive" });
    }
  }

  async function onSubmitSms(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await ingestSms.mutateAsync({
        from: smsFrom,
        text: smsText,
        property: smsProperty,
        tenantName: smsTenant,
        category: smsCategory,
        priority: smsPriority,
      });
      const id = (res as any)?.id || (res as any)?.requestId;
      toast({ title: "SMS ingested", description: "Request created from SMS." });
      if (id) {
        window.location.href = `/requests?select=${encodeURIComponent(id)}`;
      }
    } catch (err: any) {
      toast({ title: "Ingestion failed", description: err?.message || "Error", variant: "destructive" });
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Test Ingest (Email & SMS)</h3>
      <p className="mt-1 text-sm text-gray-500">
        Create requests from sample Email or SMS payloads. If your subject/text contains
        an ID like <code>REQ-xxxx</code>, ingestion will link to that request instead of creating a new one.
      </p>

      {/* Email form */}
      <form onSubmit={onSubmitEmail} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="From (Email)">
          <input className="input input-bordered rounded-xl border-gray-300" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} />
        </Field>
        <Field label="Tenant Name">
          <input className="input input-bordered rounded-xl border-gray-300" value={emailTenant} onChange={(e) => setEmailTenant(e.target.value)} />
        </Field>
        <Field label="Subject">
          <input className="input input-bordered rounded-xl border-gray-300" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        </Field>
        <Field label="Property">
          <input className="input input-bordered rounded-xl border-gray-300" value={emailProperty} onChange={(e) => setEmailProperty(e.target.value)} />
        </Field>
        <Field label="Category">
          <select className="input input-bordered rounded-xl border-gray-300" value={emailCategory} onChange={(e) => setEmailCategory(e.target.value)}>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>HVAC</option>
            <option>Noise</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Priority">
          <select className="input input-bordered rounded-xl border-gray-300" value={emailPriority} onChange={(e) => setEmailPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Body (Text)">
            <textarea className="input input-bordered h-28 w-full rounded-xl border-gray-300 p-3" value={emailText} onChange={(e) => setEmailText(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={ingestEmail.isPending}
            className="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {ingestEmail.isPending ? "Creating…" : "Create Request from Email"}
          </button>
        </div>
      </form>

      <div className="my-8 h-px w-full bg-gray-200" />

      {/* SMS form */}
      <form onSubmit={onSubmitSms} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="From (Phone)">
          <input className="input input-bordered rounded-xl border-gray-300" value={smsFrom} onChange={(e) => setSmsFrom(e.target.value)} />
        </Field>
        <Field label="Tenant Name">
          <input className="input input-bordered rounded-xl border-gray-300" value={smsTenant} onChange={(e) => setSmsTenant(e.target.value)} />
        </Field>
        <Field label="Property">
          <input className="input input-bordered rounded-xl border-gray-300" value={smsProperty} onChange={(e) => setSmsProperty(e.target.value)} />
        </Field>
        <Field label="Category">
          <select className="input input-bordered rounded-xl border-gray-300" value={smsCategory} onChange={(e) => setSmsCategory(e.target.value)}>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>HVAC</option>
            <option>Noise</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Priority">
          <select className="input input-bordered rounded-xl border-gray-300" value={smsPriority} onChange={(e) => setSmsPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Text">
            <textarea className="input input-bordered h-28 w-full rounded-xl border-gray-300 p-3" value={smsText} onChange={(e) => setSmsText(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={ingestSms.isPending}
            className="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {ingestSms.isPending ? "Creating…" : "Create Request from SMS"}
          </button>
        </div>
      </form>
    </div>
  );
}
