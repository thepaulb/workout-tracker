# Testing

The app has two independently runnable test suites, both built on
[Vitest](https://vitest.dev/). They run offline and never touch your real
`gym.db`.

## Running

From the project root:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the server suite then the client suite |
| `npm run test:server` | Server tests only |
| `npm run test:server:watch` | Server tests in watch mode |
| `npm run test:server:coverage` | Server tests + coverage report (`coverage/server/`) |
| `npm run test:client` | Client tests only |
| `npm run test:client:coverage` | Client tests + coverage report (`client/coverage/`) |

Client commands can also be run from inside `client/` (`npm test`,
`npm run test:watch`, `npm run test:coverage`).

## Server suite (`server/test/`)

Full HTTP integration tests: each test drives the real Express app in-process
with [supertest](https://github.com/ladjs/supertest) against a throwaway
**in-memory SQLite** database, seeded fresh from `schema.sql` before every test
(`server/test/setup.js`). Auth is exercised with real signed JWT cookies.

Coverage focuses on behaviour, not implementation:

- **Auth** — registration lockout, login, `/me`, `create-user`, logout, and the
  `requireAuth` middleware (missing / forged / expired tokens).
- **Multi-user isolation** (`ownership.test.js`) — the key regression guard:
  one user can never read, update, or delete another user's sessions, sets,
  body entries, goals, or progress.
- **Routes** — sessions (CRUD, weekly volume stats, cascade delete), sets
  (partial `COALESCE` updates, `is_ladder` coercion, last-set lookup), progress
  (personal bests / PR map), goals (auto-complete logic), body (date upsert),
  exercises, and programmes.

Server coverage is gated at 70% (currently ~95% of statements).

## Client suite (`client/src/**`)

React tests in jsdom with
[Testing Library](https://testing-library.com/):

- **Auth** — `AuthProvider` bootstrap/login/logout, `useAuth` guard,
  `ProtectedRoute` redirect vs render.
- **API modules** — correct URL / method / body, and that failed responses
  throw.
- **Presentational** — `PersonalBests` grouping and date formatting, `PRBadge`
  variants, and a render smoke test for the charts.

The data-heavy page components (`src/pages/`) are not yet covered — that's the
intended next step. The client has no coverage gate yet so the threshold can be
ratcheted up as those tests are added.

## Two small testability hooks in production code

- `server/db.js` reads `DB_PATH` (falling back to the bundled `gym.db`), so
  tests can point at `:memory:`.
- `server/app.js` builds and exports the Express app without listening;
  `server/index.js` only starts the listener. This lets tests import the app
  directly.
