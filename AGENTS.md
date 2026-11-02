<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sahmati UI is ported verbatim from the user's Vite/react-router source; pages live in src/pages and thin TanStack route files in src/routes wrap them (TanStack Router replaces react-router-dom; keep user markup unchanged).
- Tailwind v3 config tokens are ported into src/styles.css @theme.
- Data lives in Lovable Cloud; src/lib/store.ts keeps the old public API (useDB, actions, verifyLedger) and picks scope from path + session (/c/:sid parent, /app signed-in own school, else demo), gated in __root. Why: pages stay unchanged.
- Ledger rows are written only by database functions (_append via append_events, give_consent, parent_request, import_students, seed) which lock per school and compute seq/prev/hash; table has no client insert grant and an update/delete-blocking trigger. Why: the chain can never fork or be edited.
- Parents and the public receipt check use security-definer RPCs (parent_view, give_consent, parent_request, verify_receipt), never direct table reads. Why: real schools' rows stay staff-only under RLS (can_access = demo school or school_staff member).
- Parent OTP: sendParentCode server function (src/lib/otp.functions.ts) mints the code, stores only sha256(sid:code) via service-role otp_issue (3 sends/student/hour), and returns the code only for the demo school or when no SMS provider is configured; give_consent verifies it (5 wrong tries voids). Why: consent requires a real code server-side; SMS providers plug into the PROVIDERS list.
