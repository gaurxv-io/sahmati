import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True while the element is at least `threshold` visible. */
export function useInView<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Like useInView, but stays true once the element has been seen. */
export function useSeen<T extends Element>(threshold = 0.35) {
  const [ref, inView] = useInView<T>(threshold);
  const [seen, setSeen] = useState(false);
  useEffect(() => { if (inView) setSeen(true); }, [inView]);
  return [ref, seen, inView] as const;
}

/** Eases from the value it last showed to `target`. Holds at 0 until `active` first turns true. */
export function useCountUp(target: number, active: boolean, ms = 900) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) { from.current = target; setShown(target); return; }
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      const value = begin + (target - begin) * (1 - (1 - t) ** 3);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, ms]);
  return Math.round(shown);
}
