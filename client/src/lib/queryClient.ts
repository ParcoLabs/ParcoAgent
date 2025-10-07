import { QueryClient } from "@tanstack/react-query";
import { api } from "./api";

// Create a query client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default queryFn that uses the api helper
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as [string];
        return api(path);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// apiRequest for mutations
export async function apiRequest(
  path: string,
  options?: {
    method?: "POST" | "PATCH" | "DELETE";
    body?: any;
  }
): Promise<any> {
  return api(path, {
    method: options?.method || "POST",
    body: options?.body,
  });
}