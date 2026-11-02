import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-content-center justify-items-center gap-4 px-4 text-center">
      <Logo />
      <span className="eyebrow">404</span>
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">This page doesn't exist</h1>
      <div className="flex gap-2"><Link to="/" className="btn">Home</Link><Link to="/app" className="btn btn-primary">Open console</Link></div>
    </div>
  );
}
