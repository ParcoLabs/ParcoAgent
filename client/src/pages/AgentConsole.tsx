// client/src/pages/AgentConsole.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
  Loader2, Bot, User, Paperclip, Settings2, Send,
  Building2, ListChecks, Plus, Trash2, X,
  Play, Pause, Square, ExternalLink, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ---------------- Types ---------------- */
type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string; status?: "sending" | "done" | "error" };
type AgentContext = { propertyId?: string; propertyName?: string; requestId?: string | number; [k: string]: any };
type Conversation = { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[]; context?: AgentContext };

type StepStatus = "queued" | "running" | "done" | "failed";
type RunStep = { id: string; action: string; args?: Record<string, any>; status: StepStatus; result?: string; error?: string };
type RunStatus = "running" | "paused" | "completed" | "failed" | "stopped";
type AgentRun = {
  runId: string;
  status: RunStatus;
  steps: RunStep[];
  currentUrl: string;
  lastScreenshot: string;
  logs: string[];
};

/* ---------------- Constants ---------------- */
const LS_KEY = "parco.agent.convos";
const BRIDGE_KEY = "parco.agent.bridge";

/* ---------------- Helpers ---------------- */
const uid = () =>
  typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : "id-" + Math.random().toString(36).slice(2, 10);

const inferMode = (t: string) => {
  const s = t.toLowerCase();
  if (/(create|post|send|update|push|award|assign|complete|schedule|email|sms|quickbooks)/.test(s)) return "act";
  if (/(insight|analy(s|z)e|trend|metric|kpi|dashboard)/.test(s)) return "insight";
  return "ask";
};

const loadConvos = (): Conversation[] => {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
};
const saveConvos = (c: Conversation[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch {} };

/* ---------------- API ---------------- */
async function callAgent(params: {
  conversationId?: string;
  messages: { role: string; content: string }[];
  context?: AgentContext;
  mode?: string;
}) {
  const res = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Agent error ${res.status}`);
  return data as { message: string };
}

async function executeAgentRun(message: string): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const res = await fetch("/api/agent/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

async function fetchRunStatus(runId: string): Promise<{ ok: boolean; run?: AgentRun; error?: string }> {
  const res = await fetch(`/api/agent/runs/${runId}`);
  return res.json();
}

async function pauseRun(runId: string) {
  await fetch(`/api/agent/runs/${runId}/pause`, { method: "POST" });
}

async function resumeRun(runId: string) {
  await fetch(`/api/agent/runs/${runId}/resume`, { method: "POST" });
}

async function stopRun(runId: string) {
  await fetch(`/api/agent/runs/${runId}/stop`, { method: "POST" });
}

/* ---------------- Chat Hook ---------------- */
function useAgentChat(initialContext?: AgentContext) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([{
    id: uid(), role: "assistant",
    content: "Hi! I'm your PM agent. I can draft tenant/vendor messages, source 3 quotes, schedule visits, and create/publish rental listings. What would you like to do?",
    status: "done",
  }]);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [ctx] = React.useState<AgentContext>(initialContext || {});
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const append = React.useCallback((p: Omit<ChatMessage, "id">) => {
    const m: ChatMessage = { id: uid(), ...p };
    setMessages(v => [...v, m]);
    return m.id;
  }, []);

  const replace = React.useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages(v => v.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const scrollToBottom = React.useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, []);
  React.useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BRIDGE_KEY || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        const text: string = payload?.text || payload?.message || "";
        if (!text) return;
        append({ role: "assistant", content: `🔧 ${text}`, status: "done" });
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [append]);

  const send = React.useCallback(async (text: string, conversationId?: string) => {
    if (!text.trim()) return;
    setIsSending(true);
    append({ role: "user", content: text, status: "done" });
    const pid = append({ role: "assistant", content: "", status: "sending" });
    try {
      const payload = messages.concat([{ id: uid(), role: "user" as const, content: text, status: "done" as const }]).map(({ role, content }) => ({ role, content }));
      const data = await callAgent({
        conversationId,
        messages: payload,
        context: ctx,
        mode: inferMode(text),
      });
      replace(pid, { content: data?.message ?? "", status: "done" });
    } catch (err: any) {
      replace(pid, { content: `Error: ${err?.message || err}`, status: "error" });
    } finally {
      setIsSending(false);
      setInput("");
      scrollToBottom();
    }
  }, [append, ctx, messages, replace, scrollToBottom]);

  return { messages, input, setInput, isSending, send, listRef, context: ctx, append };
}

/* ---------------- Run Viewer Drawer ---------------- */
const RunViewerDrawer: React.FC<{
  runId: string | null;
  onClose: () => void;
}> = ({ runId, onClose }) => {
  const [run, setRun] = React.useState<AgentRun | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!runId) {
      setRun(null);
      return;
    }

    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const data = await fetchRunStatus(runId);
        if (data.ok && data.run) {
          setRun(data.run);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch run status");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch run status");
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [runId]);

  if (!runId) return null;

  const isRunning = run?.status === "running";
  const isPaused = run?.status === "paused";
  const isFinished = run?.status === "completed" || run?.status === "failed" || run?.status === "stopped";

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "queued": return <Clock size={14} className="text-gray-400" />;
      case "running": return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case "done": return <CheckCircle2 size={14} className="text-green-500" />;
      case "failed": return <AlertCircle size={14} className="text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] max-w-full bg-white shadow-xl z-50 flex flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-emerald-600" />
          <span className="font-semibold">Run Viewer</span>
          {run && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isRunning ? "bg-blue-100 text-blue-700" :
              isPaused ? "bg-yellow-100 text-yellow-700" :
              run.status === "completed" ? "bg-green-100 text-green-700" :
              run.status === "failed" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {run.status}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
          data-testid="button-close-drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Steps */}
        {run && run.steps.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Steps</div>
            <div className="space-y-1">
              {run.steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    step.status === "running" ? "bg-blue-50" :
                    step.status === "failed" ? "bg-red-50" :
                    step.status === "done" ? "bg-green-50" :
                    "bg-gray-50"
                  }`}
                >
                  <div className="mt-0.5">{getStepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {i + 1}. {step.action}
                      {step.args?.url && <span className="font-normal text-gray-500 ml-1">→ {step.args.url}</span>}
                      {step.args?.selector && <span className="font-normal text-gray-500 ml-1">→ {step.args.selector}</span>}
                    </div>
                    {step.error && <div className="text-red-600 text-xs mt-0.5">{step.error}</div>}
                    {step.result && step.status === "done" && (
                      <div className="text-gray-500 text-xs mt-0.5">{step.result}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screenshot */}
        {run?.lastScreenshot && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Screenshot</div>
            {run.currentUrl && (
              <div className="text-xs text-gray-500 truncate">{run.currentUrl}</div>
            )}
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={run.lastScreenshot + "?t=" + Date.now()}
                alt="Browser screenshot"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Logs */}
        {run && run.logs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Logs</div>
            <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
              {run.logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-300 font-mono">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-gray-50 flex items-center gap-2">
        {!isFinished && (
          <>
            {isRunning ? (
              <button
                onClick={() => runId && pauseRun(runId)}
                className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-1.5 text-sm"
                data-testid="button-pause"
              >
                <Pause size={14} /> Pause
              </button>
            ) : isPaused ? (
              <button
                onClick={() => runId && resumeRun(runId)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1.5 text-sm"
                data-testid="button-resume"
              >
                <Play size={14} /> Resume
              </button>
            ) : null}
            <button
              onClick={() => runId && stopRun(runId)}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1.5 text-sm"
              data-testid="button-stop"
            >
              <Square size={14} /> Stop
            </button>
          </>
        )}
        {run?.currentUrl && (
          <a
            href={run.currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 border rounded-lg hover:bg-white flex items-center gap-1.5 text-sm ml-auto"
            data-testid="link-open-url"
          >
            <ExternalLink size={14} /> Open URL
          </a>
        )}
      </div>
    </div>
  );
};

/* ---------------- UI Bits ---------------- */
const Chip: React.FC<React.PropsWithChildren> = ({ children }) =>
  <div className="px-3 py-1 rounded-full border text-sm mr-2 mb-2 bg-white border-gray-200">{children}</div>;

const MessageBubble: React.FC<{ m: ChatMessage }> = ({ m }) => {
  const isUser = m.role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <div className="mt-1 p-2 rounded-full bg-emerald-600/10 text-emerald-700"><Bot size={16} /></div>}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow ${isUser ? "bg-emerald-600 text-white" : "bg-white"}`}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
        {m.status === "sending" && <div className="flex items-center gap-2 text-xs mt-1 opacity-70"><Loader2 className="animate-spin" size={14} /> thinking…</div>}
        {m.status === "error" && <div className="text-xs mt-1 text-red-600">Something went wrong. Try again.</div>}
      </div>
      {isUser && <div className="mt-1 p-2 rounded-full bg-gray-100 text-gray-700"><User size={16} /></div>}
    </div>
  );
};

/* ---------------- Input Bar with Agent Mode Toggle ---------------- */
const InputBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  agentMode: boolean;
  onAgentModeChange: (v: boolean) => void;
}> = ({ value, onChange, onSend, disabled, agentMode, onAgentModeChange }) => (
  <div className="p-3 border-t bg-white">
    <div className="flex items-center gap-2">
      <button className="p-2 rounded-md border bg-white text-gray-600 hover:bg-gray-50" title="Attach"><Paperclip size={18} /></button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={agentMode ? "Tell the agent what to do (e.g., go to zillow.com)" : "Ask or instruct the agent…"}
        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        data-testid="input-chat"
      />
      <button className="p-2 rounded-md border bg-white text-gray-600 hover:bg-gray-50" title="Settings"><Settings2 size={18} /></button>
      <button
        onClick={onSend}
        disabled={disabled}
        className={`px-3 py-2 rounded-lg text-white flex items-center gap-2 ${disabled ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
        data-testid="button-send"
      >
        <Send size={16} /> Send
      </button>
      <div className="flex items-center gap-2 ml-1 pl-2 border-l">
        <Switch
          checked={agentMode}
          onCheckedChange={onAgentModeChange}
          data-testid="switch-agent-mode"
        />
        <span className={`text-sm font-medium ${agentMode ? "text-emerald-700" : "text-gray-500"}`}>
          Agent Mode
        </span>
      </div>
    </div>
    {agentMode && (
      <div className="mt-2 text-xs text-gray-500 bg-emerald-50 rounded px-2 py-1">
        Agent Mode is ON. Commands will be executed using web automation.
      </div>
    )}
  </div>
);

const ContextBar: React.FC<{ context: AgentContext }> = ({ context }) => (
  <div className="px-3 pt-3 pb-2">
    <div className="flex flex-wrap items-center">
      <Chip><span className="inline-flex items-center gap-2"><Building2 size={14} />{context.propertyName ? `Property: ${context.propertyName}` : context.propertyId ? `Property #${context.propertyId}` : "No property"}</span></Chip>
      <Chip><span className="inline-flex items-center gap-2"><ListChecks size={14} />{context.requestId ? `Request #${context.requestId}` : "No request"}</span></Chip>
    </div>
  </div>
);

const ConversationSidebar: React.FC<{
  convos: Conversation[]; activeId?: string;
  onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void;
}> = ({ convos, activeId, onSelect, onNew, onDelete }) => (
  <aside className="w-[360px] max-w-full border bg-white h-fit rounded-2xl overflow-hidden">
    <div className="p-3 border-b flex items-center justify-between bg-emerald-50/50">
      <div className="font-semibold">Conversations</div>
      <button onClick={onNew} className="inline-flex items-center gap-1 text-sm rounded-md border px-2 py-1 hover:bg-white">
        <Plus size={14} /> New
      </button>
    </div>
    <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
      {convos.length === 0 && <div className="p-4 text-sm text-gray-500">No conversations yet.</div>}
      {convos.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`w-full text-left px-3 py-3 border-b hover:bg-emerald-50/50 ${activeId === c.id ? "bg-emerald-50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm line-clamp-1">{c.title || "New chat"}</div>
            <button
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">{new Date(c.updatedAt).toLocaleString()}</div>
        </button>
      ))}
    </div>
  </aside>
);

/* ---------------- Page ---------------- */
export default function AgentConsole() {
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const qCtx: AgentContext = {
    propertyId: search?.get("propertyId") || undefined,
    propertyName: search?.get("propertyName") || undefined,
    requestId: search?.get("requestId") || undefined,
  };

  const [convos, setConvos] = React.useState<Conversation[]>(() => {
    const data = loadConvos();
    if (data.length) return data;
    const first: Conversation = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [], context: qCtx };
    return [first];
  });
  const [activeId, setActiveId] = React.useState<string>(convos[0]?.id);
  React.useEffect(() => { saveConvos(convos); }, [convos]);

  const active = React.useMemo(() => convos.find(c => c.id === activeId) || convos[0], [convos, activeId]);
  const chat = useAgentChat(active?.context);

  React.useEffect(() => {
    if (!active) return;
    const title = (() => {
      const lastUser = [...chat.messages].reverse().find(m => m.role === "user");
      return lastUser ? lastUser.content.slice(0, 48) : "New chat";
    })();
    setConvos(prev => prev.map(c => c.id === active.id ? { ...c, messages: chat.messages, updatedAt: Date.now(), title } : c));
  }, [chat.messages, active?.id]);

  const newConversation = () => {
    const c: Conversation = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [], context: qCtx };
    setConvos(p => [c, ...p]);
    setActiveId(c.id);
  };
  const deleteConversation = (id: string) => {
    setConvos(p => p.filter(x => x.id !== id));
    if (activeId === id) {
      const next = convos.find(x => x.id !== id);
      setActiveId(next?.id || "");
    }
  };

  // Agent Mode state
  const [agentMode, setAgentMode] = React.useState(false);
  const [currentRunId, setCurrentRunId] = React.useState<string | null>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);

  // Handle send based on Agent Mode
  const handleSend = async () => {
    const text = chat.input.trim();
    if (!text) return;

    if (agentMode) {
      // Agent Mode: execute run
      setIsExecuting(true);
      chat.append({ role: "user", content: text, status: "done" });
      chat.setInput("");

      try {
        const data = await executeAgentRun(text);
        if (data.ok && data.runId) {
          setCurrentRunId(data.runId);
          chat.append({ role: "assistant", content: `🤖 Started agent run. Check the Run Viewer for progress.`, status: "done" });
        } else {
          chat.append({ role: "assistant", content: `❌ Failed to start run: ${data.error || "Unknown error"}`, status: "error" });
        }
      } catch (err: any) {
        chat.append({ role: "assistant", content: `❌ Error: ${err?.message || "Unknown error"}`, status: "error" });
      } finally {
        setIsExecuting(false);
      }
    } else {
      // Normal mode: chat
      chat.send(text, active?.id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      {/* Sidebar (left app nav) */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-5">
          <div className="mx-auto w-full max-w-[1360px] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">Agent</h2>
              <p className="text-sm md:text-base text-gray-600 hidden sm:block">
                Today,&nbsp;
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </header>

        {/* Body: chat left, conversations RIGHT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1360px]">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Chat column */}
              <div className="rounded-2xl border bg-gray-50/60 overflow-hidden">
                <ContextBar context={chat.context} />
                <div
                  ref={chat.listRef}
                  className="overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-white to-gray-50
                             h-[calc(100vh-280px)] md:h-[calc(100vh-260px)]"
                >
                  {chat.messages.map(m => <MessageBubble key={m.id} m={m} />)}
                </div>
                <InputBar
                  value={chat.input}
                  onChange={chat.setInput}
                  onSend={handleSend}
                  disabled={chat.isSending || isExecuting}
                  agentMode={agentMode}
                  onAgentModeChange={setAgentMode}
                />
              </div>

              {/* RIGHT rail (sticky) */}
              <div>
                <aside className="sticky top-[104px]">
                  <ConversationSidebar
                    convos={convos}
                    activeId={active?.id}
                    onSelect={setActiveId}
                    onNew={newConversation}
                    onDelete={deleteConversation}
                  />
                </aside>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Run Viewer Drawer */}
      <RunViewerDrawer
        runId={currentRunId}
        onClose={() => setCurrentRunId(null)}
      />
    </div>
  );
}

/* --- Dev smoke check (optional) --- */
export function runAgentChatSmokeTests() {
  const a = new Set([uid(), uid(), uid()]);
  console.log("uid-unique:", a.size === 3 ? "OK" : "FAIL");
  console.log("mode-act:", inferMode("Create QuickBooks expense") === "act" ? "OK" : "FAIL");
}
