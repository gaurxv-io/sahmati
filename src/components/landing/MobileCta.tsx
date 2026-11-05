import { useEffect, useState } from "react";

// On phones, keep "Book a free audit" in reach once the hero's button has scrolled away,
// and get out of the way when the audit form itself is on screen.
export function MobileCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const form = document.getElementById("audit");
    if (!hero || !form) return;
    const seen = { hero: true, form: false };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === form) seen.form = e.isIntersecting;
      }
      setShow(!seen.hero && !seen.form);
    });
    io.observe(hero);
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`mobile-cta fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:hidden ${show ? "mobile-cta-on" : ""}`} aria-hidden={!show}>
      <a href="#audit" tabIndex={show ? 0 : -1} className="btn btn-primary btn-lg w-full">Book a free DPDP audit</a>
    </div>
  );
}
