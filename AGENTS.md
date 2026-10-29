# AGENTS.md

Guide for AI coding assistants (and new teammates) working in this repo. Read this first, then open only the docs your task needs.

## The project in one paragraph

Tech Start Hackathon 2026 is a small full-stack demo app built with:

- Frontend: Next.js + React (`frontend/`, http://localhost:3000)
- Backend: Node.js + Express (`backend/`, http://localhost:5001)
- Persistence: SQLite
- API docs: Swagger UI (http://localhost:5001/swagger-ui)

The backend is layered **routes → controllers → services → models**. See `README.md` for setup, architecture and the sprint process.

## What exists today (keep this section current)

- **Built:** health check (`GET /api/health`), API info (`GET /api`), Swagger, structured logging, a migration runner, and a welcome page with an empty login/register card.
- **Designed but NOT built:** authentication, sessions, roles, permissions, enrollment, groups. Everything in `docs/auth/` is a plan. **Don't import files, tables or middleware named there until you've confirmed they exist in the code.**

## Which doc to read for your task

"Spec" below means `docs/auth/ai-architecture-prompt.md`, the auth source of truth.

| If you're working on… | Read |
|---|---|
| Anything touching users, sign-in, roles, enrollment or groups | `docs/auth/ai-architecture-prompt.md` **§0 first**, then the rows below |
| Register, sign in (including Google), sign out, sessions, cookies | spec §5, §6 |
| Roles, permissions, `can()`, middleware | spec §7 |
| Who can do what, and the group check flow | spec §8, §9 |
| Error responses and status codes | spec §10 |
| Adding roles, permissions or other sign-in providers | spec §11 |
| Join requests | spec §8.2, §8.3, decision D-24 |
| The full schema, backend conventions, frontend wiring, Google Cloud setup | spec §12: these are **TODOs**. Don't invent a design; ask for, or create, a ticket. |
| Database migrations | `backend/migrations/MIGRATIONS.md` |
| Explaining the design to a person | `docs/auth/planning.md` |
| Logging | `backend/LOGGING.md` |
| Lint and formatting | `backend/LINTING_AND_FORMATTING.md` |

`docs/auth/ai-architecture-prompt.md` has the exact rules; `docs/auth/planning.md` is the readable summary. **Update both in the same PR whenever the plan changes.** If they disagree, the AI prompt file wins until the other is fixed.

**The README predates the auth design and is left unchanged on purpose.** Where they differ, the auth docs win:

- **Auth method:** the README suggests JWT. The design uses server-side sessions with an HttpOnly cookie.
- **CORS:** the README says CORS has explicit options. The code actually uses `origin: true`, which must be fixed before auth ships.
- **Database file:** the README lists `database.sqlite` as a project file. It's generated and git-ignored.

The full table is in spec "Where this spec differs from the README".

## Rules

1. **Follow the spec, don't redesign it.** If a task needs something the spec doesn't allow, update `docs/auth/ai-architecture-prompt.md` in the same PR and say why. Don't silently do it differently.
2. **Use the spec's exact names**: roles, permissions, tables, middleware (spec §2). For example, it's `group` in code, never `team`.
3. **Commonly suggested but rejected here:** JWTs, tokens in `localStorage`, wildcard (`'*'`) permissions, `cors({ origin: true })`. See spec §1, decisions D-03, D-05, D-11, D-08.
4. **Keep the layering:** routes wire middleware, controllers handle `req`/`res`, services hold business rules, models hold SQL.
5. **Schema changes go through migrations only** (`cd backend && npm run migrate:create -- <name>`). `database.sqlite` is git-ignored, so a table created any other way only exists on your machine.
6. **Never commit generated or local files:** `node_modules/`, `coverage/`, `.next/`, `*.sqlite`, `.env`. The `.gitignore` already covers these.

## Commands

```bash
just install         # install backend + frontend dependencies
just backend-dev     # run the API with auto-reload (http://localhost:5001)
just frontend-dev    # run the frontend (http://localhost:3000)
just backend-test    # Jest + Supertest
just ci              # lint + format check + tests + frontend build; run before opening a PR
```

## When you finish a task

- Run `just ci`.
- If you built something from `docs/auth/ai-architecture-prompt.md`, update **"What exists today"** above.
- If you changed a design decision, update **both** `docs/auth/ai-architecture-prompt.md` (and its changelog) and `docs/auth/planning.md` in the same PR.
