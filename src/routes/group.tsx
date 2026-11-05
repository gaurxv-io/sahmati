import { createFileRoute, redirect } from "@tanstack/react-router";

// Group view now lives inside the console. Keep old /group links working.
export const Route = createFileRoute("/group")({
  beforeLoad: () => { throw redirect({ to: "/app/group", replace: true }); },
});
