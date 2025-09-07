// client/src/lib/api.ts

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";
const BASE = "/api";

/**
 * Low-level API fetch helper.
 */
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

/**
 * Global queryFn for TanStack Query.
 * Expects queryKey[0] to be the API path (e.g. ["/requests"]).
 */
export async function queryFn<T = unknown>({ queryKey }: { queryKey: any }): Promise<T> {
  const [path] = queryKey as [string, any?];
  if (typeof path !== "string") {
    throw new Error("First queryKey entry must be a string path.");
  }
  // Call our api() helper with the path — it already prepends BASE
  return api<T>(path);
}
