## Project context

- Small React + TypeScript frontend scaffolded with Vite. Entry: `index.html` -> `src/main.tsx` -> `src/App.tsx`.
- No backend integration in this repository: data is currently in-memory in `src/App.tsx` (see `deals` initial state).
- Build uses TypeScript project references (`tsc -b`) before `vite build` (see `package.json` `build` script).

## Big-picture architecture

- UI: `src/App.tsx` — top-level state (list of `Deal`) and tab filtering UX.
- Presentation: `src/components/DealCard.tsx` — displays a `DealView` and exposes `onUpvote`/`onDownvote` callbacks.
- Domain logic: `src/scoring.ts` — computes `score` and `label` (Frontpage/Popular/New). Updates here affect sorting and UI labels.
- Types: `src/types.ts` — canonical `Deal`, `DealView`, and `Tab` definitions. Update types when changing data shapes.

Data flow summary:
- `App` holds `deals: Deal[]` in React state -> maps to `DealView` by calling `calculateScore` and `getLabelFromScore` -> filtered/sorted for display -> passed to `DealCard` which calls back to `App` to update counts.

## Developer workflows / useful commands

- Start dev server with HMR: `npm run dev` (uses `vite`).
- Build for production: `npm run build` (runs `tsc -b` then `vite build`).
- Preview production build: `npm run preview`.
- Lint: `npm run lint`.

If you change TypeScript project references or add new top-level tsconfigs, remember `build` invokes `tsc -b`.

## Conventions & patterns in this repo

- Inline styles: components use inline `style={{ ... }}` rather than CSS modules. Keep new components consistent unless adding global styles in `src/index.css`.
- Small, focused components: `DealCard` contains only rendering and event callbacks; business rules live in `scoring.ts` and `App.tsx`.
- Minimal state: `App` stores canonical `Deal[]`; derived fields (`score`, `label`) are computed on render and expressed as `DealView`.
- Type-first changes: change `src/types.ts` first when modifying the shape of deals or tabs, then update usages.

## What to change where — quick examples

- Adjust ranking/label logic: edit `src/scoring.ts` (affects sort order & labels across the app).
- Add fields to deals (e.g., `imageUrl`): add to `Deal` in `src/types.ts`, update `deals` initial data in `src/App.tsx`, and update `DealCard` to render it.
- Persisting data / API integration: introduce an API layer and replace in-memory `deals` in `App` with fetched data; keep `calculateScore` usage for derived fields.

## Code generation guidance for Copilot-style agents

- Keep edits minimal and local: prefer changing `scoring.ts` or `DealCard.tsx` rather than mutating many files.
- Maintain TypeScript types: update `src/types.ts` before using new fields; run `npm run build` to catch type errors.
- Preserve inline styling pattern unless adding new global styles in `src/index.css`.
- Tests: none present — when adding behavior tests, follow Vite + React testing norms and add configs to `package.json`.

## Important files to inspect when editing features

- App state & UX: `src/App.tsx`
- Component rendering: `src/components/DealCard.tsx`
- Business rules: `src/scoring.ts`
- Types: `src/types.ts`
- Dev tooling: `package.json`, `vite.config.ts`, `tsconfig.json`

## When to ask the human

- If a change requires adding an external dependency, ask before modifying `package.json`.
- If you need a new global style approach (CSS modules, Tailwind, etc.), confirm preferred styling strategy.

---
If any section is unclear or you want the file expanded (examples, recommended PR checklist, or test commands), tell me which parts to expand.
