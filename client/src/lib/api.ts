type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";
const BASE = "/api";

export async function api<T = unknown>(
  path: string,
  opts: { method?: HttpMethod; body?: any } = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_API_KEY || "", // optional for dev
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}
