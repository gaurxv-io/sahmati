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
- Parent OTP: sendParentCode server function (src/lib/otp.functions.ts) mints the code, stores only sha256(sid:code) via service-role otp_issue (3 sends/student/hour; 20 for the demo school), and returns the code only for the demo school or when no SMS provider is configured; give_consent verifies it (5 wrong tries voids). Why: consent requires a real code server-side; SMS providers plug into the PROVIDERS list.
- Staff roles (principal/office/teacher/auditor) live on school_staff and are enforced in RLS via my_role/can_write/can_admin/can_see_cls/can_see_sid (demo school = principal for everyone); team changes go through invite_staff/set_staff_role/remove_staff, and invited users join via accept_invite on first sign-in. Why: the UI only hides buttons, the database is the boundary.
- Access log rows are written only by _log: _append logs every change automatically, log_access records views/exports. Why: "who changed anything" can't be skipped by a client.
- Parent data packs (/p/:token) and the public school page (/s/:slug) read through security-definer RPCs (pack_view, public_school); pack tokens are returned once by create_pack and stored as sha256 only. Why: no anonymous table reads of real schools.
