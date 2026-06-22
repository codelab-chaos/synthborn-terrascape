# Terrascape tests

Tests are split into three tiers by what they exercise and how they run. Each tier has its
own location, file-naming convention, and runner, so they never collide and each can be run
in isolation.

| Tier | What it covers | Location | Files | Runner |
| --- | --- | --- | --- | --- |
| **Java unit** | Server-side logic (config, access gate, tokens, CORS) | `src/test/java/…` (mirrors `src/main/java`) | `*Test.java` | JUnit 5 via Gradle |
| **Web unit** | Pure browser logic with no DOM/three.js (the `common/` modules) | `tests/web-unit/…` (mirrors `web/src`) | `*.test.ts` | `node:test` |
| **E2E** | The running viewer in a real browser | `tests/e2e/` | `*.spec.js` | Playwright |

## Running

```sh
# Java unit (+ JaCoCo report at build/reports/jacoco/test/)
./gradlew test                # or: npm run test:java

# Web unit
npm run test:web              # plain run
npm run test:unit:coverage    # with line/branch/function coverage

# Both unit tiers with coverage in one shot
npm run coverage              # or: npm run test:unit (alias)

# E2E / runtime (needs a running Terrascape server; see playwright.config.js)
npm run testlive              # full suite
npm run testlive:headed       # headed browser
npm run testlive:ui           # Playwright UI mode

# Everything (CI/release)
npm run test:release
```

## Conventions

- **Mirror the source tree.** A test for `web/src/common/utils.ts`
  lives at `tests/web-unit/common/utils.test.ts`; a test for
  `…/terrascape/access/AccessGate.java` lives at `…/test/java/…/access/AccessGateTest.java`.
  When you add the first test for a new area (e.g. `terrain/`), create the matching
  subfolder rather than dropping files at the tier root.
- **One source module per test file**, named after the module it covers.
- **File naming:** Java `*Test.java`; web unit `*.test.ts`; E2E `*.spec.js`. The suffixes
  are load-bearing — Playwright only scans `tests/e2e`, and the web-unit runner only scans
  `tests/web-unit`, so the two never pick up each other's files.
- **Shared fixtures/helpers** go in a `support`/`testsupport` folder beside the tests that
  use them, never inside a `*Test`/`*.test` file. Java example:
  `src/test/java/…/testsupport/FakeHttpExchange.java`.

## Coverage notes

- Web-unit coverage is scoped to `web/src/common/*.js` — the pure,
  framework-free modules. DOM/three.js-coupled modules are intentionally exercised by the
  E2E tier instead of unit tests.
- Java coverage is reported by JaCoCo (`./gradlew test` emits XML/CSV/HTML). The large
  `terrain/*` and `TerrascapeWebServer` subsystems are currently uncovered and are the
  highest-value targets for new tests.

## What to test where

- Pure function or data transform → **unit** tier (Java or web). Fast, deterministic, no I/O.
- HTTP/permission/CORS wiring that can be driven through a fake exchange → **Java unit**
  with a `testsupport` stub (see `FakeHttpExchange`).
- Anything that needs the browser, three.js, or the live server → **E2E**.
