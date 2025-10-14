// client/src/components/ui/use-toast.ts
// Minimal hook that satisfies imports like "@/components/ui/use-toast".
// It will log to console by default and can delegate to a global toaster if you add one.
// Works even if you also have toast.tsx / Toaster components.

export type ToastVariant = "default" | "destructive" | "success";
export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastFn = (opts: ToastOptions) => void;

const fallbackToast: ToastFn = (opts) => {
  const prefix =
    opts.variant === "destructive" ? "[toast:error]" :
    opts.variant === "success" ? "[toast:ok]" : "[toast]";
  console.log(prefix, opts.title ?? "", opts.description ?? "");
};

// If you later wire a visual toaster, set `window.__toast = (opts) => { ... }`
const globalToast: ToastFn = (opts) => {
  try {
    const w = window as any;
    if (w && typeof w.__toast === "function") {
      w.__toast(opts);
      return;
    }
  } catch { /* SSR/no-window safe */ }
  fallbackToast(opts);
};

export function useToast() {
  return { toast: globalToast };
}

export const toast: ToastFn = globalToast;
