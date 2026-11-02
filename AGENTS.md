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
- Tailwind v3 config tokens are ported into src/styles.css @theme; data is client-only via src/lib/store.ts (localStorage), gated in __root until loaded.
