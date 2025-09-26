import React, { useEffect, useState } from "react";

type Draft = {
  id: string;
  createdAt: string;
  status: "draft" | "sent";
  kind: "tenant_reply" | "vendor_outreach";
  channel: "email" | "sms";
  to: string;
  subject?: string | null;
  body: string;
};

export default function AgentDraftsPanel({ requestId }: { requestId: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDrafts() {
    setLoading(true);
    const res = await fetch(`/api/agent/drafts?requestId=${requestId}`);
    const data = await res.json();
    setDrafts(data.drafts || []);
    setLoading(false);
  }

  async function runAgent() {
    await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    await loadDrafts();
  }

  async function approveDraft(id: string) {
    await fetch(`/api/agent/drafts/${id}/approve`, { method: "POST" });
    await loadDrafts();
  }

  useEffect(() => {
    loadDrafts();
  }, [requestId]);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">AI Agent Drafts</h3>
        <button
          onClick={runAgent}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Agent
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-gray-500">No drafts yet. Click "Run Agent".</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="p-3 border rounded bg-white shadow-sm text-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">
                  {d.kind === "tenant_reply" ? "Tenant Reply" : "Vendor Outreach"}{" "}
                  ({d.channel})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    d.status === "sent"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {d.status}
                </span>
              </div>
              {d.subject && <div className="font-semibold">{d.subject}</div>}
              <pre className="text-xs whitespace-pre-wrap mt-1">{d.body}</pre>
              {d.status === "draft" && (
                <button
                  onClick={() => approveDraft(d.id)}
                  className="mt-2 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Approve & Send
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
