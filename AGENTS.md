# AGENTS.md - ascend_one_day_at_a_time

This file contains high-signal guidance for agents working in this AdonisJS repo.
Every line answers: "Would an agent likely miss this without help?"

## Commands

| Command             | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `pnpm start`        | Start the server (`node ace serve`)                                         |
| `pnpm dev`          | Dev server with HMR (`node ace serve --hmr`)                                |
| `pnpm build`        | Build (`node ace build`)                                                    |
| `pnpm test`         | Run tests (`node ace test`, Japa runner)                                    |
| `pnpm lint`         | Lint (`eslint .`)                                                           |
| `pnpm lint:fix`     | Fix lint issues                                                             |
| `pnpm format`       | Format with Prettier (`prettier --write .`)                                 |
| `pnpm format:check` | Check formatting (`prettier --check .`)                                     |
| `pnpm typecheck`    | Typecheck (`tsc --noEmit` + `tsc --noEmit --project inertia/tsconfig.json`) |
| `pnpm prepare`      | Husky setup (husky install)                                                 |

## Environment

- `.env` is the primary env file; `.env.test` only overrides `SESSION_DRIVER=memory`
- All other test env vars fall back to `.env`
- `APP_URL` in config/app.ts is derived from `env.get('APP_URL')` — set in `.env`
- `DB_CONNECTION=pg` in config, but `.env` has PG connection details; SQLite is commented out in `config/database.ts`
- Ensure PostgreSQL is running if using the DB (`pg` client); `better-sqlite3` is available for SQLite
- Run migrations with `node ace migration:make <name>` and `node ace migration:run`

## Monorepo / Package boundaries

- Single pnpm workspace (root is the only package)
- `app/` contains backend code (controllers, models, middleware, etc.)
- `inertia/` contains the React + Vite frontend (Inertia.js integration)
- `database/migrations/` — migration files; `database/schema.ts` is auto-generated from migrations
- `providers/api_provider.ts` — adds `ctx.serialize()` for consistent API responses
- `providers/` — custom service providers registered in `adonisrc.ts`
- `imports` in `package.json` map `#*` aliases to `./app/*, ./start/*, ./config/*`, etc.
- `#generated/*` maps to `./.adonisjs/server/*.js` — these are codegen outputs

## Key framework quirks

- `adonisrc.ts` `hooks.init` runs `indexEntities`, `indexPages`, and `generateRegistry()` — do not remove without codegen re-run
- `adonisrc.ts` `tests.suites` has unit/functional/browser with different timeouts (2s/30s/300s)
- `ctx.serialize(data)` from `api_provider.ts` wraps responses in `{ data: ... }` — use in API controllers
- `UserTransformer` at `app/transformers/user_transformer.ts` — use `UserTransformer.transform(auth.user)` in Inertia `share()`
- Inertia middleware at `app/middleware/inertia_middleware.ts` shares `user` and `errors` with all pages
- `allowScripts` in package.json includes `better-sqlite3`, `esbuild` — needed for native deps
- `useAsyncLocalStorage: false` in `config/app.ts` — ALS is disabled
- `allowMethodSpoofing: false` in `config/app.ts` — no `_method` spoofing

## Testing quirks

- Test suites: `unit` (files matching `tests/unit/**/*.spec.{ts,js}`), `functional` (`tests/functional/**/`), `browser` (`tests/browser/**/`)
- `tests/bootstrap.ts` starts http server for functional/browser suites — do not remove `testUtils.httpServer().start()`
- `.env.test` only sets `SESSION_DRIVER=memory`; all other vars come from `.env`
- DB assertions plugin `@adonisjs/lucid/plugins/db` is configured in bootstrap — tests need a running DB unless using memory session
- `forceExit: false` in `adonisrc.ts` tests config — tests may not exit cleanly; use `--run` flag if needed

## Lint / Type / Format order

Always run in this order: `lint` -> `typecheck` -> `test`

- `pnpm typecheck` also checks the Inertia tsconfig; a failure here blocks test
- `prettier` ignores `.adonisjs`, `node_modules`, `build` (per `.prettierignore`)
- `lint-staged` runs on pre-commit (`pnpm exec lint-staged`); it runs `lint` and `format` on staged files

## Conventional commits

- Project follows [Conventional Commits](CONVENTIONAL_COMMIT.md)
- Format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Commitlint runs on every commit via Husky (`pnpm exec commitlint --edit "$1"`)

## Infra / Docker

- `docker-compose.yml` defines services (check for DB, Redis, app)
- Redis is configured in `.env` (`REDIS_CONNECTION=local`, host/port)
- If running locally: ensure Postgres (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`) and Redis are accessible
