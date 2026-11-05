import { useEffect, useMemo, useState } from "react";
import { BANDS, band, sortedStudents } from "@/lib/derive";
import { prefersReducedMotion, useSeen } from "@/lib/motion";
import type { DB, Student } from "@/lib/types";
import { HeroCard } from "@/components/HeroCard";
import { PhoneDemo, type Scene } from "./PhoneDemo";

// The hero's one orchestrated moment: a parent consents on the phone, and the school's register
// beside it updates. It plays through a few sample parents while on screen, then rests on the
// last receipt. Reduced motion shows that resting state straight away.

const PARENTS = 4;
const SCENES: [Scene, number][] = [["typing", 1000], ["message", 2300], ["consent", 2500], ["otp", 1900], ["done", 2800]];

function pickParents(db: DB) {
  const pending = sortedStudents(db).filter((s) => s.status === "pending");
  // Take turns across the class bands so a different bar moves each time.
  const byBand = BANDS.map((name) => pending.filter((s) => band(s.cls) === name));
  const picks: Student[] = [];
  for (let round = 0; picks.length < PARENTS && byBand.some((b) => b.length > round); round++) {
    for (const list of byBand) { const s = list[round]; if (s && picks.length < PARENTS) picks.push(s); }
  }
  return picks;
}

export function HeroDemo({ db }: { db: DB }) {
  const queue = useMemo(() => pickParents(db), [db]);
  const [ref, seen, inView] = useSeen<HTMLDivElement>(0.3);
  const [step, setStep] = useState(() => (prefersReducedMotion() ? SCENES.length - 1 : 0)); // index into SCENES
  const [n, setN] = useState(0); // which parent is on the phone

  const last = n >= queue.length - 1 && step === SCENES.length - 1;
  useEffect(() => {
    if (!inView || last || prefersReducedMotion() || !queue.length) return;
    const t = setTimeout(() => {
      if (step < SCENES.length - 1) setStep(step + 1);
      else { setN(n + 1); setStep(0); }
    }, SCENES[step]![1]);
    return () => clearTimeout(t);
  }, [inView, step, n, last, queue.length]);

  const student = queue[Math.min(n, queue.length - 1)];
  const scene = SCENES[step]![0];
  const given = queue.slice(0, n + (scene === "done" ? 1 : 0)).map((s) => s.id);

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-0">
      <div className="relative z-10 shrink-0">
        {student ? <PhoneDemo scene={scene} student={student} school={db.school.name} n={n} /> : null}
      </div>
      <div className="w-full max-w-[400px] sm:-ml-4 sm:mt-20 sm:w-[372px]">
        <HeroCard db={db} given={given} seen={seen} />
        <p className="mt-3 px-1 text-[13px] leading-snug text-muted-2 sm:pl-8">
          A parent consents on their phone. Your register updates the same moment, with proof attached.
        </p>
      </div>
    </div>
  );
}
