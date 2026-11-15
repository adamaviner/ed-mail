# @earthdance/mail

Convex component + client + React package for Earthdance's email. `README.md` has the layout, the
verified facts about Convex components, developing and releasing. The design and stages are in
ed-schedule's `docs/email-lib-plan.md`.

- `npm run check` before committing (build first; the example app typechecks through `dist`).
- After changing component functions or schema: `npm run build:codegen` and commit `src/component/_generated`.
- Formatting is Prettier's (no semicolons, single quotes, 200 columns). Imports inside `src` use `.js` extensions.
- `core` imports neither Convex nor React. `component` has no network access and no secrets. Nothing
  here may assume an app's login, router, Vite or WordPress: ed-schedule and ed-market both use it.
- List queries are paginated and indexed; never read `bodies` from a list query.
- `react` uses only its own primitives (`src/react/ui`, on `@base-ui/react`) and shadcn token classes, never an app's
  components. Tests that need a DOM start with `// @vitest-environment happy-dom`.
- Comments explain why, in plain sentences.
- Release only with `npm run release -- X.Y.Z`; never commit `dist` on a branch.
