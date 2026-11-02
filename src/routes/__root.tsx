import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { initStore, retry, setRoute, useStore } from "../lib/store";
import CreateSchool from "../pages/CreateSchool";
import { Toaster } from "../components/toast";
import { ShieldIcon } from "../components/brand";
import NotFound from "../pages/NotFound";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return <NotFound />;
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sahmati · DPDP compliance for Indian schools" },
      { name: "description", content: "DPDP compliance for Indian schools: parent consent on WhatsApp, tamper-evident records, reports and the DPDP Ready School badge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%2300E07A'/%3E%3Cpath d='M12 4l6 2.5v5c0 4-2.6 6.4-6 7.7-3.4-1.3-6-3.7-6-7.7v-5L12 4z' fill='none' stroke='%2304130B' stroke-width='1.8'/%3E%3C/svg%3E" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const st = useStore();
  const { pathname } = useLocation();
  useEffect(() => { setRoute(pathname); }, [pathname]);
  useEffect(() => { initStore(); }, []);
  const onApp = pathname === "/app" || pathname.startsWith("/app/");

  return (
    <QueryClientProvider client={queryClient}>
      {st.status === "ready" && st.db ? (
        <Outlet />
      ) : st.status === "onboard" && onApp ? (
        <CreateSchool />
      ) : st.status === "error" ? (
        <div className="grid min-h-screen place-content-center justify-items-center gap-3 px-4 text-center">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-brand"><ShieldIcon /></span>
          <p className="font-semibold">Sahmati can't reach its servers right now.</p>
          <p className="max-w-[360px] text-[13px] text-muted-2">Check your internet connection. Your school's records are safe; nothing was lost.</p>
          <button className="btn btn-primary" onClick={() => retry()}>Try again</button>
        </div>
      ) : (
        <div className="grid min-h-screen place-content-center justify-items-center gap-3">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-brand"><ShieldIcon /></span>
          <p className="text-muted-2">Opening Sahmati…</p>
        </div>
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
