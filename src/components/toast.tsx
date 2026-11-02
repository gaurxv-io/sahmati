import { useEffect, useState } from "react";

let push: (msg: string) => void = () => {};
export const toast = (msg: string) => push(msg);

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    push = (m) => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 2800); };
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-card">
      {msg}
    </div>
  );
}
