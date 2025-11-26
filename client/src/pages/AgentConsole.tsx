// client/src/pages/AgentConsole.tsx
import * as React from "react";
import Sidebar from "@/components/dashboard/sidebar";
import {
  Loader2, Bot, User, Paperclip, Settings2, Send,
  Building2, ListChecks, Plus, Trash2, ChevronDown, Globe, X,
  Play, RefreshCw, ExternalLink, Save, FolderOpen
} from "lucide-react";

/* ---------------- Types ---------------- */
type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string; status?: "sending" | "done" | "error" };
type AgentContext = { propertyId?: string; propertyName?: string; requestId?: string | number; [k: string]: any };
type Conversation = { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[]; context?: AgentContext };

/* ---------------- Constants ---------------- */
const LS_KEY = "parco.agent.convos";
const BRIDGE_KEY = "parco.agent.bridge"; // dashboard↔agent activity bridge

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

/* ---------------- Chat Hook ---------------- */
function useAgentChat(initialContext?: AgentContext) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([{
    id: uid(), role: "assistant",
    content: "Hi! I’m your PM agent. I can draft tenant/vendor messages, source 3 quotes, schedule visits, and create/publish rental listings. What would you like to do?",
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

  // Bridge: surface dashboard-triggered activity into the chat stream
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

  // IMPORTANT: send supports conversationId so server can keep dialog state
  const send = React.useCallback(async (text: string, conversationId?: string) => {
    if (!text.trim()) return;
    setIsSending(true);
    append({ role: "user", content: text, status: "done" });
    const pid = append({ role: "assistant", content: "", status: "sending" });
    try {
      const payload = messages.concat([{ role: "user", content: text }]).map(({ role, content }) => ({ role, content }));
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

  return { messages, input, setInput, isSending, send, listRef, context: ctx };
}

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

/* ---------------- Web Automation Types ---------------- */
type WebStep = { action: string; args?: Record<string, any> };
type WebRecipe = { name: string; steps: WebStep[]; createdAt: string };

/* ---------------- Web Automation Modal ---------------- */
const WebAutomationModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = React.useState<string>("");
  const [startUrl, setStartUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [stepAction, setStepAction] = React.useState<string>("goto");
  const [stepSelector, setStepSelector] = React.useState("");
  const [stepUrl, setStepUrl] = React.useState("");
  const [stepText, setStepText] = React.useState("");
  const [stepMs, setStepMs] = React.useState<number>(1000);
  const [stepEngine, setStepEngine] = React.useState<"css" | "xpath">("css");

  const [recipes, setRecipes] = React.useState<WebRecipe[]>([]);
  const [currentSteps, setCurrentSteps] = React.useState<WebStep[]>([]);
  const [recipeName, setRecipeName] = React.useState("");
  const [showRecipeInput, setShowRecipeInput] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      fetch("/api/agent/web/recipes")
        .then(r => r.json())
        .then(setRecipes)
        .catch(() => {});
    }
  }, [open]);

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/web/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: startUrl || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setSessionId(data.sessionId);
        setScreenshotUrl(data.screenshotUrl + "?t=" + Date.now());
        setCurrentUrl(data.currentUrl);
      } else {
        setError(data.error || "Failed to start session");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const runStep = async (action: string, args?: Record<string, any>) => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/web/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, args }),
      });
      const data = await res.json();
      if (data.ok) {
        setScreenshotUrl(data.screenshotUrl + "?t=" + Date.now());
        setCurrentUrl(data.currentUrl);
        setCurrentSteps(prev => [...prev, { action, args }]);
      } else {
        setError(data.error || "Step failed");
      }
    } catch (e: any) {
      setError(e?.message || "Step failed");
    } finally {
      setLoading(false);
    }
  };

  const refreshScreenshot = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agent/web/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.ok) {
        setScreenshotUrl(data.screenshotUrl + "?t=" + Date.now());
        setCurrentUrl(data.currentUrl);
      }
    } catch {}
    setLoading(false);
  };

  const closeSession = async () => {
    if (!sessionId) return;
    try {
      await fetch("/api/agent/web/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {}
    setSessionId(null);
    setScreenshotUrl(null);
    setCurrentUrl("");
    setCurrentSteps([]);
  };

  const saveRecipe = async () => {
    if (!recipeName.trim() || currentSteps.length === 0) return;
    try {
      const res = await fetch("/api/agent/web/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: recipeName.trim(), steps: currentSteps }),
      });
      const data = await res.json();
      setRecipes(data);
      setRecipeName("");
      setShowRecipeInput(false);
    } catch {}
  };

  const loadRecipe = async (recipe: WebRecipe) => {
    for (const step of recipe.steps) {
      await runStep(step.action, step.args);
    }
  };

  const handleRunCurrentStep = () => {
    switch (stepAction) {
      case "goto":
        runStep("goto", { url: stepUrl });
        break;
      case "click":
        runStep("click", { selector: stepSelector, engine: stepEngine });
        break;
      case "type":
        runStep("type", { selector: stepSelector, text: stepText, engine: stepEngine });
        break;
      case "waitFor":
        runStep("waitFor", { selector: stepSelector, engine: stepEngine });
        break;
      case "wait":
        runStep("wait", { ms: stepMs });
        break;
      case "screenshot":
        runStep("screenshot", {});
        break;
    }
  };

  const handleClose = () => {
    closeSession();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-[101] w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe size={20} /> Web Automation
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-md">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {!sessionId ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start URL (optional)</label>
                <input
                  data-testid="input-start-url"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <button
                data-testid="button-start-session"
                onClick={startSession}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Start Session
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Controls */}
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      data-testid="select-step-action"
                      value={stepAction}
                      onChange={(e) => setStepAction(e.target.value)}
                      className="flex-1 rounded border px-2 py-1.5 text-sm"
                    >
                      <option value="goto">Goto URL</option>
                      <option value="click">Click Selector</option>
                      <option value="type">Type into Selector</option>
                      <option value="waitFor">Wait for Selector</option>
                      <option value="wait">Wait (ms)</option>
                      <option value="screenshot">Screenshot</option>
                    </select>
                    <select
                      value={stepEngine}
                      onChange={(e) => setStepEngine(e.target.value as "css" | "xpath")}
                      className="rounded border px-2 py-1.5 text-sm"
                    >
                      <option value="css">CSS</option>
                      <option value="xpath">XPath</option>
                    </select>
                  </div>

                  {stepAction === "goto" && (
                    <input
                      data-testid="input-step-url"
                      value={stepUrl}
                      onChange={(e) => setStepUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  )}

                  {(stepAction === "click" || stepAction === "type" || stepAction === "waitFor") && (
                    <input
                      data-testid="input-step-selector"
                      value={stepSelector}
                      onChange={(e) => setStepSelector(e.target.value)}
                      placeholder="CSS or XPath selector..."
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  )}

                  {stepAction === "type" && (
                    <input
                      data-testid="input-step-text"
                      value={stepText}
                      onChange={(e) => setStepText(e.target.value)}
                      placeholder="Text to type..."
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  )}

                  {stepAction === "wait" && (
                    <input
                      data-testid="input-step-ms"
                      type="number"
                      value={stepMs}
                      onChange={(e) => setStepMs(Number(e.target.value))}
                      placeholder="Milliseconds"
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  )}

                  <button
                    data-testid="button-run-step"
                    onClick={handleRunCurrentStep}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    Run Step
                  </button>
                </div>

                {/* Actions bar */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={refreshScreenshot}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                  {currentUrl && (
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Open URL
                    </a>
                  )}
                  <button
                    onClick={closeSession}
                    className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <X size={14} /> Close Session
                  </button>
                </div>

                {/* Recipe controls */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="text-sm font-medium">Recipes</div>
                  {currentSteps.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Current: {currentSteps.length} step(s)
                    </div>
                  )}
                  {showRecipeInput ? (
                    <div className="flex gap-2">
                      <input
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder="Recipe name"
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                      <button
                        onClick={saveRecipe}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowRecipeInput(false)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRecipeInput(true)}
                      disabled={currentSteps.length === 0}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save size={14} /> Save Recipe
                    </button>
                  )}
                  {recipes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipes.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => loadRecipe(r)}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center gap-1"
                        >
                          <FolderOpen size={12} /> {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              {/* Right: Screenshot */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Screenshot</div>
                {currentUrl && (
                  <div className="text-xs text-gray-500 truncate">{currentUrl}</div>
                )}
                {screenshotUrl ? (
                  <div className="border rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={screenshotUrl}
                      alt="Browser screenshot"
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="h-64 border rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    No screenshot
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Agent Mode Button ---------------- */
const AgentModeButton: React.FC<{ onOpenWebAutomation: () => void }> = ({ onOpenWebAutomation }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        data-testid="button-agent-mode"
        onClick={() => setMenuOpen(!menuOpen)}
        className="px-3 py-2 rounded-lg border bg-gray-800 text-white hover:bg-gray-700 flex items-center gap-1"
      >
        Agent Mode <ChevronDown size={14} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[160px]">
            <button
              data-testid="menu-web-automation"
              onClick={() => {
                setMenuOpen(false);
                onOpenWebAutomation();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Globe size={16} /> Web Automation
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const InputBar: React.FC<{ 
  value: string; 
  onChange: (v: string) => void; 
  onSend: () => void; 
  disabled?: boolean;
  onOpenWebAutomation: () => void;
}> = ({ value, onChange, onSend, disabled, onOpenWebAutomation }) => (
    <div className="p-3 border-t bg-white">
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-md border bg-white text-gray-600 hover:bg-gray-50" title="Attach"><Paperclip size={18} /></button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Ask or instruct the agent…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <button className="p-2 rounded-md border bg-white text-gray-600 hover:bg-gray-50" title="Settings"><Settings2 size={18} /></button>
        <button
          onClick={onSend}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-white flex items-center gap-2 ${disabled ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
        >
          <Send size={16} /> Send
        </button>
        <AgentModeButton onOpenWebAutomation={onOpenWebAutomation} />
      </div>
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
  // Deep-link context: /agent?propertyId=..&propertyName=..&requestId=..
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const qCtx: AgentContext = {
    propertyId: search?.get("propertyId") || undefined,
    propertyName: search?.get("propertyName") || undefined,
    requestId: search?.get("requestId") || undefined,
  };

  // conversations persisted locally
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

  // Keep conversation title/messages in sync
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

  // Web Automation Modal
  const [webAutomationOpen, setWebAutomationOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 md:flex-row flex-col">
      {/* Sidebar (left app nav) */}
      <div className="md:block hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header — align with other pages */}
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
                  onSend={() => chat.send(chat.input, active?.id)}   // <-- send with conversationId
                  disabled={chat.isSending}
                  onOpenWebAutomation={() => setWebAutomationOpen(true)}
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

      {/* Web Automation Modal */}
      <WebAutomationModal open={webAutomationOpen} onClose={() => setWebAutomationOpen(false)} />
    </div>
  );
}

/* --- Dev smoke check (optional) --- */
export function runAgentChatSmokeTests() {
  const a = new Set([uid(), uid(), uid()]);
  console.log("uid-unique:", a.size === 3 ? "OK" : "FAIL");
  console.log("mode-act:", inferMode("Create QuickBooks expense") === "act" ? "OK" : "FAIL");
}
