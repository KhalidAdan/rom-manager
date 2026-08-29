# The Testing Bible: A TypeScript / React / React Router Reference for Humans and AI Agents

*Living document. Last major revision: August 2026. Scoped to TypeScript + React 19, React Router v7/v8 (library, framework, and declarative modes), Vitest 4, React Testing Library, MSW 2, Playwright, and Storybook. Designed to be split or extended later — keep the §0 hard rules and decision table authoritative for AI agents.*

---

## 0. How to Use This Document (READ FIRST — especially if you are an AI coding agent)

This document is authoritative context. When generating test plans, test cases, or test code for this codebase, follow these **hard rules** unless the human explicitly overrides them.

### Hard rules (directives)
1. **Test behavior, not implementation.** Assert on what a user can see or do (rendered output, URL, network calls), never on internal component state, private methods, or a component's variable names. Guiding principle (Testing Library): *"The more your tests resemble the way your software is used, the more confidence they can give you."*
2. **Query by accessible role first.** Use `getByRole`/`findByRole` with the `name` option as your default. Fall back down the priority ladder (`getByLabelText` → `getByPlaceholderText` → `getByText` → `getByDisplayValue` → `getByAltText`/`getByTitle` → `getByTestId`). `getByTestId` is a last resort. Never use `container.querySelector`.
3. **Use `userEvent` (v14+), not `fireEvent`,** for simulating interaction, and always `await` it. Create the instance with `const user = userEvent.setup()`.
4. **Never sleep.** No `setTimeout`/fixed delays. Use `findBy*`, `waitFor`, `waitForElementToBeRemoved`, or Playwright web-first assertions that auto-retry.
5. **Mock at the network boundary with MSW, not `fetch`/`axios`.** Set `onUnhandledRequest: 'error'` in test setup.
6. **One behavior per test.** A test name states the behavior: `it('shows a validation error when email is empty')`. Multiple `expect`s that verify one behavior are fine; testing several unrelated behaviors in one test is not.
7. **Assertions must be meaningful.** No assertion-free tests. No snapshot as the only assertion. No `expect(true).toBe(true)`. Every test must be able to fail for a real reason.
8. **`queryBy*` is only for asserting absence** (`expect(screen.queryByText(...)).not.toBeInTheDocument()`). Never use `getBy*` to check that something is absent — it throws.
9. **No conditional logic (`if`/`for`/`try`) in tests.** If you need variants, use `it.each`/`test.each`.
10. **Isolate.** No shared mutable state between tests. Each test sets up its own data and cleans up (RTL auto-cleanup + `server.resetHandlers()` in `afterEach`). Tests must pass in random order.
11. **For React Router route components in framework mode, prefer testing loaders/actions as plain functions and reusable subcomponents with `createRoutesStub`; test whole routes via Playwright E2E.** Do not fight the `Route.*` generated types in unit tests.
12. **When you generate a test, assert the *intended* behavior described by the spec/ticket, not merely the current output of the code.** If intended behavior is unknown, ask or write the test against the specification — never write a test that just mirrors whatever the implementation currently returns (a "vacuous"/"characterization-only" test) and call it done.
13. **Write a failing regression test for every bug fix.**
14. **Prefer real collaborators over mocks when they are fast and deterministic** (sociable tests). Mock only I/O, time, randomness, and things you don't own.

### Decision table — "What kind of test should I write for X?"

| If the thing under test is… | Write this | Tools |
|---|---|---|
| A pure function / formatter / reducer / Zod schema | Unit test | Vitest |
| A custom hook (no router/query deps) | Unit test with `renderHook` | Vitest + RTL |
| A React Router `loader`/`action` | Unit test as a plain async fn (construct a `Request`) | Vitest |
| A presentational component (props → DOM) | Component test | Vitest + RTL |
| A component using router hooks (`useNavigate`, `useLoaderData`, `<Link>`) | Component test with `createRoutesStub` | Vitest + RTL + RR |
| A feature flow across components + data fetching | Integration test | Vitest + RTL + MSW (+ QueryClient/router) |
| A full route module (loader + action + component + SSR) | E2E test | Playwright |
| A critical user journey (login → checkout) | E2E smoke test | Playwright |
| Front-end performance | Perf test | Lighthouse CI, bundle budgets |
| Back-end/API under load | Load test | k6 |
| Cross-service API compatibility | Contract test | Pact / OpenAPI |
| Visual appearance | Visual regression | Chromatic / Playwright screenshots |
| Test-suite quality itself | Mutation test | Stryker |

### Table of Contents
1. Testing Theory & Strategy Fundamentals
2. The Modern TypeScript/React Testing Toolchain (2026)
3. Testing React Router Specifically
4. Test Types — Deep Treatment
5. Process, CI/CD, and Organization
6. Anti-Patterns Catalog
7. Prompt-style Checklists for Agents
8. Glossary
9. Appendix: Recommended Config Files
10. Authoritative Sources

---

## TL;DR
- **For a Vite + TypeScript + React 19 + React Router v7/v8 stack in 2026, adopt Kent C. Dodds's "Testing Trophy":** static analysis (TS + ESLint) as an always-on base, a bulk of **integration tests** (component subtree + real router + MSW), targeted unit tests for complex pure logic, and a thin, ruthless E2E layer for critical journeys. Use **Vitest 4 + React Testing Library + MSW 2** for unit/integration and **Playwright** for E2E.
- **React Router is the make-or-break detail:** test **loaders/actions as plain async functions** (construct a `Request`, assert redirects/thrown responses/`data()`), test **router-hook-dependent subcomponents with `createRoutesStub`**, and test **whole framework-mode route modules and SSR/hydration/progressive-enhancement via Playwright** — the official docs explicitly say `createRoutesStub` is *not* designed for direct testing of framework-mode Route components.
- **The rules that most improve test quality:** query by accessible role, use `userEvent` (awaited) not `fireEvent`, mock only at the network boundary with `onUnhandledRequest: 'error'`, never sleep (always `findBy`/`waitFor`/web-first assertions), treat coverage as a signal (validate with **Stryker** mutation testing, not 100% worship), and quarantine — never auto-retry-hide — flaky tests.

## Key Findings
- **Toolchain has consolidated on Vitest.** Vitest 4.0 (ViteConf, October 2025) marked Browser Mode **stable**; for any Vite-based app it is the default runner, with Jest reserved for large legacy CommonJS suites and React Native.
- **React Router v7 unified with Remix**; the same package powers declarative, data/library, and framework modes. Testing strategy differs sharply per mode.
- **Integration-heavy testing (Trophy/Honeycomb) is the 2025–2026 consensus for component-based frontends** because most bugs live at the seams between units.
- **Coverage lies; mutation score tells the truth.** Automated a11y catches ~57% of issues; the rest needs humans. Core Web Vitals now center on **INP** (replaced FID, March 2024).
- **Flaky tests are a first-order risk** with well-documented industry playbooks (Google, Uber, Spotify, Fowler): quarantine with an owner and SLA, don't auto-retry.

## Details

---

## 1. Testing Theory & Strategy Fundamentals

### 1.1 Pyramid vs. Trophy vs. Honeycomb/Diamond

- **Test Pyramid** (Mike Cohn, *Succeeding with Agile*, 2009): a wide base of fast unit tests, fewer integration tests, very few slow E2E tests. Optimizes for speed and low maintenance; assumes a "thick domain layer" where most complexity lives in units.
- **Testing Trophy** (Kent C. Dodds, 2018): from bottom to top — **Static analysis** (TypeScript, ESLint) → **Unit** → **Integration (the largest layer)** → **E2E (thin cap)**. Motto: *"Write tests. Not too many. Mostly integration."* Rationale: in a modern component-based frontend, most bugs live at the seams *between* units (component + hook + data), so integration tests give the best **confidence per dollar**.
- **Testing Honeycomb** was introduced by André Schaffer on the Spotify Engineering blog, "Testing of Microservices" (January 2018), drawing on J.B. Rainsberger's talk "Integrated Tests Are A Scam": *"A more fitting way of structuring our tests for Microservices would be the Testing Honeycomb… we should focus on Integration Tests, have a few Implementation Detail Tests and even fewer Integrated Tests (ideally none)."* The related **Testing Diamond** gives roughly equal weight to unit and integration, thin on UI.

**2025–2026 prescriptive stance for this stack:** Favor the **Trophy**. Put your bulk of effort into integration tests (a component subtree + real router + MSW). Keep unit tests for genuinely complex pure logic. Keep a **thin, ruthless E2E layer** for critical journeys only. Treat TypeScript + ESLint as the always-on base layer. Avoid the **ice-cream cone** anti-pattern (lots of manual/E2E, few unit) — it is slow and flaky.

### 1.2 Fowler: unit vs integration, solitary vs sociable, test doubles

Per Martin Fowler (martinfowler.com "UnitTest", "Mocks Aren't Stubs", "TestDouble"), drawing on Gerard Meszaros's *xUnit Test Patterns*:

- **Solitary** unit test: isolates the unit; all collaborators are replaced with doubles ("mockist"/London school).
- **Sociable** unit test: exercises the unit *with* its real collaborators, assuming they're correct ("classicist"/Detroit school).
- **Test double taxonomy** (Meszaros, popularized by Fowler):
  - **Dummy** — passed around but never used (fills parameter lists).
  - **Fake** — working implementation unsuitable for production (e.g., in-memory DB).
  - **Stub** — returns canned answers to calls made during the test (controls indirect *inputs*).
  - **Spy** — a stub that also records how it was called (captures indirect *outputs*).
  - **Mock** — pre-programmed with expectations; uses **behavior verification** (fails if expected calls don't happen).
- **"Mocks Aren't Stubs"** core point: stubs use *state verification*; mocks use *behavior verification*. Choose based on what makes the test's intent clearest. For React apps, prefer **sociable + state/output verification** (assert on the DOM) over mock-heavy behavior verification.

### 1.3 Behavior vs. implementation detail

An **implementation detail** is anything the user (and consumers of your module) don't care about: internal state variable names, whether you used `useReducer` vs `useState`, the number of renders, CSS class names, private functions. Testing these produces brittle tests that break on refactors that don't change behavior. **Test the public contract:** given inputs/props/user actions, assert on observable outputs (rendered DOM, navigation, network requests, callbacks fired).

### 1.4 Structure & naming

- **Arrange-Act-Assert (AAA)** / **Given-When-Then (GWT)**. Keep the three phases visually distinct.
- **Naming:** describe the behavior and condition, e.g. `it('disables submit while the form is pending')`. Use `describe` blocks per component/feature.
- **One-assertion-per-test debate:** the useful version is *one behavior per test*. Multiple assertions that collectively verify one behavior are fine and often clearer than artificially splitting.

### 1.5 Quality attributes — FIRST

Good tests are **F**ast, **I**solated/Independent, **R**epeatable (deterministic), **S**elf-validating (pass/fail with no manual interpretation), **T**imely. Add **readable** and **maintainable**. Determinism is non-negotiable.

### 1.6 Flaky tests

A flaky test passes and fails without code changes. They destroy trust in the suite.

**Scale data (Google):** Per John Micco's Google Testing Blog post "Flaky Tests at Google and How We Mitigate Them" (May 2016) and the follow-up IEEE Software paper (2017), Google sees about **1.5% of all test runs report a flaky result**, roughly **16% of their tests** have some flakiness, and about **84% of pass→fail transitions** involve a flaky test. Google spends between **2–16% of compute** re-running flaky tests.

**Common causes (academic):** Luo, Hariri, Eloussi & Marinov, "An Empirical Analysis of Flaky Tests" (FSE 2014), analyzing 201 commits fixing flaky tests across 51 Apache projects, found: *"Asynchronous wait (45%), concurrency (20%), and test-order dependency (12%) were found to be the most common causes of test flakiness."* Other causes: time/clock/timezone, randomness, network, animations, shared state, resource leaks.

**How big orgs handle it:**
- **Google:** an automated **quarantine** tool removes too-flaky tests from the critical path and files a bug; a flakiness-change-detection tool blames the causing commit; reruns are used *only* for already-flagged tests.
- **Uber:** the "Testopedia" central test registry. Per Uber Engineering's "Handling Flaky Unit Tests in Java," they *"classify all tests on the main branch with 100 consecutive successful runs as stable, and the remaining tests as flaky."* Per "Flaky Tests Overhaul at Uber," *"In the Go Monorepo, we are steadily detecting around 1000 flaky tests out of 600K in total and 1K/350K in Java."* Flaky tests run in non-blocking mode; critical tests always run.
- **Spotify:** "Odeneye" test-suite visualization and "Flakybot" pre-merge checker; move flaky tests into a **separate quarantine suite** with an owner and deadline.
- **Martin Fowler ("Eradicating Non-Determinism in Tests", 2011):** quarantine non-deterministic tests into a separate suite *temporarily*, cap the quarantine size, and force fixes. Quote: *"Non-deterministic tests… are useless… a virulent infection that can completely ruin your entire test suite."*

**Retry policy debate:** Auto-retry (rerun-until-green) is widely considered an anti-pattern because it **masks** root causes and inflates CI time — Dave Haeffner's SauceCon talk framed it as "a re-run culture is toxic." Consensus: **quarantine ≠ disable** — a quarantined test keeps running in a non-blocking context (still producing data) with a tracking ticket, named owner, and SLA (2–4 weeks). Rule of thumb: if >10% of tests are quarantined, you have an infrastructure problem, not a flaky-test problem.

**Detection:** flip-rate analysis (same commit flips pass/fail), repeat runs (`playwright --repeat-each=5`), ingesting JUnit XML history. Tools: Trunk Flaky Tests, Datadog Test Visibility, BuildPulse, Currents, TestDino.

### 1.7 Code coverage & mutation testing

- **Coverage types:** line, statement, branch, function. **Branch coverage** is the most informative.
- **Coverage is a signal, not a goal (Goodhart's law).** 100% coverage worship produces gamed, assertion-light tests. Reasonable defaults: ~80% lines/branches on business logic, with critical modules higher; don't gate trivial code.
- **Vitest coverage providers:** `v8` (default, fast, uses V8's built-in coverage) vs `istanbul` (instrumentation-based, historically more precise branch reporting). As of Vitest 3+, the `v8` provider gained AST-aware remapping making it much closer to Istanbul's accuracy; use `v8` by default and switch to `istanbul` only if you need its specific report semantics.
- **Mutation testing (Stryker / StrykerJS):** injects small changes ("mutants") into your code and checks whether tests fail ("kill" the mutant). The **mutation score** (% killed) is a far more honest measure of suite quality than coverage — you can have 100% coverage and a 0% mutation score. Runners: `@stryker-mutator/vitest-runner`, jest-runner, etc. Community guidance: a mutation score above ~80% indicates a strong suite; below ~60% indicates significant gaps. "Equivalent mutants" cannot be killed, so 100% is neither practical nor necessary. Run Stryker in incremental mode on changed files in PRs, targeting critical business logic first.

### 1.8 Test data management

- **Fixtures** (static data) vs **factories** (functions that build objects with overridable defaults). Prefer factories.
- **Builder pattern / Object Mother:** named constructors for common domain objects (`aUser().withAdminRole().build()`).
- **`@faker-js/faker`** for realistic random data — but **seed it** (`faker.seed(123)`) for determinism.
- Keep test data local to the test; avoid a giant shared fixtures file that couples tests.

### 1.9 Classical test-design techniques → React

Rooted in the IEEE 829 test-documentation heritage (now superseded by ISO/IEC/IEEE 29119) and lightweight modern equivalents:
- **Equivalence partitioning:** group inputs that should behave the same; test one per class (valid email, malformed email, empty).
- **Boundary value analysis:** test edges (min-1, min, min+1, max-1, max, max+1) — e.g. password length 7/8/9; empty list vs 1 item vs many.
- **Decision tables:** enumerate combinations of conditions → expected action. Great for permission/role logic and feature flags. Translate rows to `it.each`.
- **State-transition testing:** model UI states (idle → loading → success/error) and test each transition. Maps directly to data-fetching components.
- **Pairwise/combinatorial:** when many independent options combine, test all *pairs* rather than all combinations to cut cases.

**The universal "what to test for a UI" contract:** rendering, user interaction, state changes, side effects (network), **loading state, empty state, error state**, boundary conditions, accessibility.

### 1.10 Risk-based testing

Prioritize by **likelihood × impact**. Test money paths, auth, data-loss paths, and legally sensitive flows first and most thoroughly. Don't spend E2E budget on cosmetic features.

### 1.11 Property-based testing (fast-check)

`fast-check` generates hundreds of random inputs against **invariants** ("properties" that must always hold) and **shrinks** failing cases to a minimal reproduction. Beats example-based tests for: reversible operations (`decode(encode(x)) === x`), sorting/idempotence, parsers/formatters, and anything with a large input space. It integrates with Vitest/Jest and is the standard PBT library for JS/TS — per Snyk Advisor (fast-check package page, latest v4.8.0, 2026) it receives **21,368,896 weekly npm downloads**, classifying it as a "Key ecosystem project." Keep example-based tests for known edge cases and regressions; add property tests for invariants.

### 1.12 Snapshot testing

- **Useful for:** serializable non-visual output (a formatted config object, an error message map) and small **inline snapshots** (`toMatchInlineSnapshot`) that live next to the assertion.
- **Harmful when:** large auto-generated DOM snapshots nobody reads, so they get rubber-stamped on update (`-u`) — this is snapshot abuse. Prefer explicit assertions on specific text/roles, and visual regression tools for actual appearance.

---

## 2. The Modern TypeScript/React Testing Toolchain (2026)

### 2.1 Vitest (v4+)

**State of the world:** Vitest 4.0 shipped at ViteConf (October 2025) and marked **Browser Mode as stable**, adding visual regression testing and Playwright trace support. Vitest 3.2 (June 2025) deprecated the `vitest.workspace` file in favor of the `projects` option in the root config, and deprecated the `workspace` name.

**Key capabilities:**
- **Config:** `vitest.config.ts` (or `test` key in `vite.config.ts`). Multi-environment via `test.projects`.
- **Environments:** `jsdom`, `happy-dom`, or **browser mode**. `happy-dom` is faster but less complete; `jsdom` is more compatible; browser mode renders in a real browser.
- **Globals:** `globals: true` to avoid importing `describe/it/expect` (enable types via `types: ['vitest/globals']`).
- **Mocking:** `vi.mock()` (hoisted), `vi.fn()`, `vi.spyOn()`, `vi.useFakeTimers()`/`vi.setSystemTime()`, `vi.stubEnv`, `vi.stubGlobal`.
- **Concurrency:** `describe.concurrent`/`it.concurrent`; parallel by default across files via worker pool.
- **Type testing:** `expectTypeOf()` and `assertType()` with `vitest --typecheck`.
- **In-source testing:** `if (import.meta.vitest)` blocks.
- **Benchmarking:** `bench()` + `vitest bench`.

**Vitest vs Jest (2026 verdict):** For any **Vite-based** React app, **use Vitest**. It shares Vite's esbuild transform pipeline (native ESM + TS, no `ts-jest`/Babel overhead), and its watch mode re-runs only affected files via the module graph — watch re-runs in ~hundreds of ms vs Jest's seconds. Jest 30 (with `@swc/jest`) closed much of the cold-start gap and remains the right choice for large legacy CommonJS suites, React Native (`jest-expo`; Vitest has no RN support), or when a Jest-only plugin has no equivalent. The `vi` API is largely drop-in compatible with `jest`.

### 2.2 React Testing Library (RTL)

- **Query variants:** `getBy*` (throws if not found/immediately present), `queryBy*` (returns null; for absence), `findBy*` (async, retries; for elements that appear later). `*AllBy*` for multiples.
- **Query priority (official):** Role (`getByRole` + `name`) → `getByLabelText` → `getByPlaceholderText` → `getByText` → `getByDisplayValue` → `getByAltText` → `getByTitle` → `getByTestId` (last resort).
- **`screen`:** use `screen.getByRole(...)` rather than destructuring from `render`.
- **user-event v14+** over `fireEvent`: it simulates full interaction sequences (focus, keydown, etc.). Always `await user.click(...)`. Create once with `userEvent.setup()`.
- **Async utilities:** `findBy*`, `waitFor` (poll until callback stops throwing — put a **single assertion** inside, no side effects), `waitForElementToBeRemoved`.
- **`act()`:** RTL wraps renders/events for you. You rarely need manual `act`; an "act warning" usually means state updated outside an awaited interaction — fix by awaiting `user`/`findBy`, not by wrapping in `act`.
- **`renderHook`** for hooks; returns `result.current`.
- **Cleanup:** automatic between tests under Vitest/Jest globals.
- **Custom render** with providers (theme, query client, router) — see appendix.
- **Matchers:** `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveAccessibleName`, `toBeDisabled`, etc.). Import `@testing-library/jest-dom/vitest` in setup.
- **Lint:** `eslint-plugin-testing-library` (bans `container.querySelector`, wrong query for absence, missing `await` on async queries) and `eslint-plugin-jest-dom` (prefer semantic matchers). Enable both.

### 2.3 React 19 specifics

- Import `act` from **`react`** (`import { act } from 'react'`), not `react-dom/test-utils` (deprecated).
- **Suspense & transitions:** wrap state-changing interactions so pending states resolve; use `findBy*` after transitions settle.
- **Server Components (RSC):** stable in React 19 for frameworks, but the **bundler-level APIs are not semver-stable** and there is **no first-class unit-testing story** for async Server Components in jsdom yet. Practical guidance: test RSCs' data logic as plain async functions; test the rendered result via **E2E (Playwright)** against a running server. Test Client Components (`"use client"`) normally with RTL.
- **`use` hook:** can only be called in render; test via a Suspense boundary + `findBy`.
- **Form actions / `useActionState` / `useOptimistic`:** render the form, submit with `userEvent`, assert on pending UI and the resulting DOM. Note `useActionState`'s `initialState` must be serializable when used with Server Functions, and errors thrown in the action bubble to the nearest Error Boundary.

### 2.4 Mock Service Worker (MSW) v2

- **Node (tests):** `setupServer(...handlers)` from `msw/node`. **Browser (dev/Storybook/Playwright):** `setupWorker` from `msw/browser`.
- **Handlers:** `http.get/post/...` and `graphql.query/mutation`; respond with **`HttpResponse.json(...)`**. `http.all`, `passthrough()`, and `HttpResponse` for status/headers.
- **Lifecycle in setup file:** `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`.
- **`onUnhandledRequest: 'error'`** is the single most valuable setting — it turns any unexpected request into a test failure (MSW ignores common static assets by default).
- **Per-test overrides:** `server.use(...errorHandlers)` to simulate 500s/401s/empty/loading states for a single test, reset by `resetHandlers()`.
- **Why MSW over mocking `fetch`/`axios`:** you test your real data layer at the network boundary, mocks are transport-agnostic and reusable across unit/integration/E2E/Storybook, and they don't drift when you swap HTTP clients.

### 2.5 Playwright

- **Web-first assertions** (`await expect(locator).toBeVisible()`) auto-retry until condition/timeout — no manual waits. **Auto-waiting** on actions checks actionability (attached, visible, stable, enabled).
- **Locators, recommended priority:** `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId`. Avoid CSS/XPath. Role-based locators are the single biggest flake-reducer.
- **Isolation:** fresh `BrowserContext` per test.
- **Fixtures & projects:** custom fixtures for auth/data; **projects** for cross-browser (Chromium/Firefox/WebKit) and for **setup dependencies** (an auth "setup project" that saves `storageState` reused by other projects).
- **Parallelism & sharding:** parallel workers by default; `--shard=1/4` across CI machines.
- **Debugging:** **Trace Viewer** (`trace: 'on-first-retry'`), `test.step()` for readable steps, UI mode.
- **API testing:** `request` context for setup/teardown and pure API checks.
- **Network:** `page.route()` for interception/mocking; can also run MSW.
- **Visual comparison:** `toHaveScreenshot()`.
- **Retries & flake:** `retries: process.env.CI ? 2 : 0`; the HTML reporter flags flaky tests.
- **Component testing** (`@playwright/experimental-ct-react`) remains **experimental**; for component tests prefer Vitest Browser Mode in 2026.

**Playwright vs Cypress (2026):** Playwright is the default recommendation for new E2E suites — free parallelism, true multi-browser (WebKit), multi-tab/origin, faster, better tracing. Cypress remains popular with great DX and mature component testing, but its parallelism is a paid feature and its architecture is more constrained. For this stack: **Playwright** for E2E and **Vitest Browser Mode** for component-in-browser.

### 2.6 Storybook (9/10)

- **Interaction tests:** `play` functions run `userEvent` + assertions in-browser.
- **Vitest addon (`@storybook/addon-vitest`):** transforms stories into Vitest tests via **portable stories**, running them in **Vitest Browser Mode** (Playwright Chromium). It does a smoke-render test plus runs the `play` function. This is the modern replacement for the older test-runner for Vite-based setups (the CLI test-runner still exists for non-Vite frameworks and needs a running Storybook).
- **`composeStories`/`composeStory`:** reuse stories directly inside Vitest/RTL tests (call `setProjectAnnotations` once in a setup file).
- **a11y addon:** runs axe on stories.
- **Chromatic:** hosted visual regression built on Storybook.

### 2.7 Other tooling

- **happy-dom vs jsdom:** happy-dom faster, jsdom more spec-complete. Default jsdom unless speed matters and your APIs are supported.
- **user-event + fake timers pitfall:** `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` when using `vi.useFakeTimers()`, otherwise interactions hang.
- **Stryker** (mutation), **fast-check** (PBT), **@faker-js/faker** (data).
- **Testcontainers** for integration against real Postgres/Redis in Node/back-end tests.
- **Contract testing:** Pact JS (consumer-driven), Zod/schema validation, OpenAPI-based tools (`msw-auto-mock` generates handlers from a spec; Optic, Dredd, Schemathesis, Specmatic). tRPC / GraphQL Codegen / OpenAPI-generated clients give **type-level contracts** as a complement.

### 2.8 Vitest Browser Mode vs jsdom (current recommendation)

Use **jsdom/happy-dom** for the bulk of fast component/integration tests. Use **Browser Mode** (stable since Vitest 4) when you need real layout/rendering fidelity: `color-contrast` a11y checks (jsdom returns "incomplete" because it does no layout), focus/tab order, `IntersectionObserver`/`ResizeObserver`, real CSS, and visual snapshots. Many teams run a hybrid: jsdom project + browser project via `test.projects`.

---

## 3. Testing React Router (v7/v8)

> React Router v7 unified with Remix; the same package powers **library mode** (`createBrowserRouter`/`RouterProvider` or declarative `<BrowserRouter>`) and **framework mode** (route modules with `loader`/`action`/`ErrorBoundary`/`meta`/`links`, SSR, `react-router.config.ts` + Vite plugin, generated `+types`). The current stable line is v8.x; the docs cover v8, v7, and v6.

### 3.1 The three modes and what changes for testing

| Mode | How you build routes | How to test |
|---|---|---|
| **Declarative** (`<BrowserRouter>`, `<Routes>`) | JSX routes, no loaders/actions | Wrap component in `<MemoryRouter initialEntries={[...]}>`; assert DOM/URL |
| **Data / library** (`createBrowserRouter`/`RouterProvider`) | Route objects with loaders/actions | `createMemoryRouter(routes, { initialEntries })` + `RouterProvider`; or `createRoutesStub` for subcomponents |
| **Framework** (route modules + Vite plugin, SSR) | File/config routes, `Route.*` types | Test loaders/actions as functions; reusable subcomponents with `createRoutesStub`; **whole routes via Playwright E2E** |

### 3.2 Testing components that use router hooks

For components using `useNavigate`, `useParams`, `useSearchParams`, `useLocation`, `useMatches`, `useFetcher`, `useNavigation`, `useSubmit`, `useLoaderData`, `useActionData`, `useRouteLoaderData` — they must render inside a router context. Use **`createRoutesStub`** (the modern replacement for `createRemixStub`/`unstable_createRemixStub`).

```ts
import { createRoutesStub } from "react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

test("LoginForm renders error messages from actionData", async () => {
  const Stub = createRoutesStub([
    {
      path: "/login",
      Component: LoginForm,
      action() {
        return { errors: { username: "Username is required" } };
      },
    },
  ]);

  render(<Stub initialEntries={["/login"]} />);
  await userEvent.click(screen.getByRole("button", { name: /login/i }));
  await waitFor(() => screen.getByText("Username is required"));
});
```

`createRoutesStub` route objects accept `path`, `Component`, `loader`, `action`, `HydrateFallback`, `children`, `ErrorBoundary`, and you pass `initialEntries` to the rendered stub. It provides real router context so `loaderData`, `actionData`, and `matches` work.

**Official caveat (verbatim from React Router docs):** `createRoutesStub` is *"designed for unit testing of reusable components… that rely on contextual router information."* It is *"not designed for (and is arguably incompatible with) direct testing of Route components"* using the framework-mode `Route.*` types, because those types derive from your real app's loaders/actions and route tree. If you must, add `// @ts-expect-error` on the `Component`. Otherwise the docs recommend: *"we recommend you do that via an Integration/E2E test (Playwright, Cypress, etc.) against a running application."*

**Testing `useNavigate`:** prefer asserting on **rendered output after navigation** (add a destination route to the stub and assert its content appears) rather than mocking `useNavigate` and asserting it was called — the latter tests an implementation detail.

### 3.3 Testing loaders and actions as pure functions

Loaders/actions are async functions taking `{ request, params, context }`. Test them directly — no DOM, no router:

```ts
import { loader, action } from "./todos";
import { expect, test, vi } from "vitest";
import * as api from "~/api/todos";

test("loader returns todos", async () => {
  vi.spyOn(api, "fetchTodos").mockResolvedValue([{ id: "1", title: "x" }]);
  const res = await loader({
    request: new Request("http://test/todos"),
    params: {},
    context: {} as any,
  });
  expect(res.todos).toHaveLength(1);
});
```

- **Redirects:** in RR7+, `redirect("/x")` returns a `Response`. Assert `res.status === 302` and `res.headers.get("Location")`.
- **Thrown responses / 404:** loaders often `throw data(null, { status: 404 })` or throw a `Response`. Test with `await expect(loader(args)).rejects.toEqual(...)` or catch and inspect `isRouteErrorResponse(err)`.
- **`data()`** wraps a value with status/headers (`DataWithResponseInit`); assert on `.data`, `.init.status`.
- **Note (RR7):** loaders/actions now return `DataWithResponseInit | Response`, so you can't blanket-assert `instanceof Response`. Check the shape you returned.
- **Recommended architecture (Sergio Xa / community):** treat loaders/actions as **integration points** — keep business logic in separate functions and unit-test *those*; keep loader/action tests thin (parsing request, authz, mapping to response).

### 3.4 Route-level error boundaries

Export an `ErrorBoundary` that calls `useRouteError()` and narrows with `isRouteErrorResponse(error)`. Test by rendering a stub whose loader throws, then assert the boundary UI renders. For full-route error behavior, prefer E2E.

### 3.5 Nested/index/layout routes, outlets, param typing

- Build the nested tree in `createMemoryRouter`/`createRoutesStub` (parent with `children`, `index: true` for index routes, layout route rendering `<Outlet/>`), set `initialEntries` to the deep path, assert nested content renders inside the layout.
- **Types:** framework mode generates `+types/<route>` giving `Route.LoaderArgs`, `Route.ActionArgs`, `Route.ComponentProps`. Use these in route code; stubs won't align with them (see 3.2).

### 3.6 Testing forms & pending/optimistic UI

- Render a route with `<Form method="post">` (or `fetcher.Form`) and an `action`; submit via `userEvent.click(submit)`; assert resulting UI (`actionData` errors, redirect destination).
- **Pending UI:** `useNavigation().state === "submitting"|"loading"` drives spinners/disabled buttons. In `createMemoryRouter`/stub, add a slow action and assert the pending UI appears before resolution (use `findBy`; be careful with fake timers).
- **Optimistic UI:** assert the optimistic value shows immediately, then the confirmed value after the action resolves.
- **Progressive enhancement:** the real test that a `<Form>` works without JS belongs in **Playwright with JavaScript disabled** (see 3.9).

### 3.7 Testing SSR / framework-mode behavior

- **`clientLoader`/`clientAction`, `HydrateFallback`:** unit-test `clientLoader` as a function; the `HydrateFallback` render path and hydration are best verified in E2E.
- **Streaming/deferred data (`Await` + `<Suspense>`):** in a stub/memory router, return a promise from the loader; assert the fallback shows, then the resolved value appears with `findBy`.
- **Hydration mismatches, `entry.server`, single fetch:** verify via Playwright against the running SSR app (check no hydration error in console, content present on first paint).

### 3.8 Middleware, `headers`, `meta`, `links`

- **Route-level `headers`/`meta`/`links` exports** are plain functions — unit test them directly (call with the documented args, assert returned array/object).
- **Middleware** (RR7 `unstable_`/stabilizing): test the composed behavior (authz redirect, context population) primarily via loader/E2E tests; unit-test the middleware function's logic where extracted.

### 3.9 E2E with Playwright

- Assert on **URL** (`await expect(page).toHaveURL(/\/dashboard/)`), test **client-side nav** (click `<Link>` → new content, no full reload) vs **full loads**, test **back/forward** (`page.goBack()`).
- **Hydration check:** load the page, assert content is present and interactive, and that no hydration console errors occurred.
- **Progressive enhancement:** create a project/context with `javaScriptEnabled: false`, submit a `<Form>`, and assert the server-handled result — proves the action works without client JS.
- **Auth:** a setup project logs in once and saves `storageState`; feature tests reuse it.

### 3.10 Common pitfalls

- Rendering a router-dependent component **without** router context → hook errors. Wrap in stub/memory router.
- **`act()` warnings / navigation not settling:** always `await` `userEvent` and use `findBy`/`waitFor`; navigation and loaders are async.
- **`createMemoryRouter` initial entries:** set `initialEntries`/`initialIndex` to the exact path/state under test.
- **Mocking `useNavigate` vs asserting rendered output:** prefer the latter.
- Historically, data routers + loaders in **jsdom** hit low-level request errors in older versions — keep RR and jsdom current.

---

## 4. Test Types — Deep Treatment (React/TS specifics)

### 4.1 Unit tests
Target: pure functions, reducers, utilities, Zod schemas, formatters, custom hooks. **Mock:** I/O, time, randomness, network, modules you don't own. **Don't mock:** the thing under test, or cheap pure collaborators. Test Zod schemas by `safeParse`-ing valid + each invalid variant (boundary/equivalence).

### 4.2 Component tests
Render with props, interact with `userEvent`, assert DOM. Cover controlled/uncontrolled inputs, context via a custom render wrapper. Test the state matrix: loading/empty/error/success.

### 4.3 Integration tests
Multiple components + real router + MSW + real state management. This is your **primary** layer.

- **TanStack Query** (extremely common with RR): create a **fresh `QueryClient` per test** with **`retry: false`** in `defaultOptions.queries` (otherwise error tests time out on the default 3 retries with exponential backoff — the client default is a fallback that individual queries can still override). Wrap in `QueryClientProvider` in your custom render. Silence error logging in test env if needed. Don't turn off retries in the app just for tests. Use MSW to drive success/error/loading.
- **Redux Toolkit:** create a real store per test with `configureStore({ reducer, preloadedState })`, render inside `<Provider>`; assert on rendered output, not store internals. Slice reducers are unit-tested as pure functions.
- **Zustand:** reset the store between tests (`afterEach`, e.g. `store.setState(initialState, true)` or a mock).
- **XState:** unit-test machines with transition helpers; integration-test components driven by the machine.

### 4.4 E2E & smoke tests
E2E = a few critical journeys against a real (or realistic) running app. A **smoke suite** is a tiny, fast subset run post-deploy to confirm the app is up and core flows work (login, load dashboard, key action). Add **synthetic monitoring** (scheduled Playwright/uptime checks) for production. Keep E2E ruthless — it's the slowest, flakiest layer.

### 4.5 Performance testing

**Front-end:**
- **Core Web Vitals (2026):** **LCP ≤ 2.5s**, **INP ≤ 200ms**, **CLS ≤ 0.1**, measured at the **75th percentile** of real users (field data / CrUX). **INP replaced FID on March 12, 2024** — it measures all interactions, not just the first, and is stricter. Poor thresholds: LCP > 4s, INP > 500ms, CLS > 0.25.
- **Lab tools:** Lighthouse / **Lighthouse CI** (`@lhci/cli`, `lhci autorun`). Assertions in `lighthouserc.js` at `'error'` level fail CI (non-zero exit). Use `numberOfRuns: 3–5` (median) to reduce noise. Add a `budget.json` for resource-size budgets. Official GH Action: `treosh/lighthouse-ci-action@v12`. Note Lighthouse doesn't measure INP in lab (uses **TBT** as a proxy); real INP needs CrUX/RUM.
- **Bundle budgets:** `size-limit` or `bundlesize` gates in CI.
- **Re-renders / React Compiler:** React Profiler, `why-did-you-render` to catch wasteful re-renders. The **React Compiler** (React 19) auto-memoizes, reducing the need for manual `useMemo`/`useCallback`; validate perf with the Profiler rather than assuming.

**Back-end / load:**
- **k6** (Grafana) is the recommended tool. Types: **smoke** (<5 VUs, validate script), **average-load** (typical traffic vs SLOs), **stress** (beyond expected, find limits), **spike** (near-zero ramp, sudden surge), **soak/endurance** (sustained, find memory leaks/degradation), **breakpoint** (ramp to find capacity).
- **SLOs via thresholds** — a breached threshold makes k6 exit non-zero and fails CI:
```js
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],                 // <1% errors
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // latency budget
    checks: ['rate>0.99'],
  },
};
```
  **Critical:** k6 *checks* record assertions but do **not** fail the build; only **thresholds** fail CI. Use `abortOnFail` + `delayAbortEval` to stop catastrophic runs early. Don't use averages for latency SLOs — use p95/p99.
- **GitHub Actions:** `grafana/setup-k6-action@v1` + `grafana/run-k6-action@v1`.
- Alternatives: Artillery, Gatling, JMeter.

### 4.6 Security testing

Map the **OWASP Top 10:2025** (announced November 2025 at OWASP Global AppSec, final release early 2026; the 2025 methodology analyzed 589 CWEs) to what a React/TS app can test. New in 2025: **A03 Software Supply Chain Failures** (expands "Vulnerable & Outdated Components") and **A10 Mishandling of Exceptional Conditions**; **Security Misconfiguration rose to A02**; **SSRF was absorbed into A01 Broken Access Control**; "Sensitive Data Exposure" → root-cause "Cryptographic Failures."

Concrete test cases a coding agent can write:
- **Broken Access Control (A01):** for each protected route/loader, test that an unauthenticated/under-privileged request is redirected/403'd (test authorization **at the loader/middleware level**, not just hidden UI). Test IDOR: user A cannot load user B's resource. **SSRF in SSR loaders:** if a loader fetches a user-supplied URL, test that internal/metadata addresses are rejected.
- **XSS:** test that user content is escaped; if you use `dangerouslySetInnerHTML`, test that input is sanitized with **DOMPurify**. Assert no `<script>` survives.
- **CSRF / auth / session / JWT:** test token expiry handling, that protected mutations require a valid token, logout clears session.
- **CSP & security headers:** test responses include `Content-Security-Policy`, `X-Content-Type-Options`, etc. (integration/E2E against the server).
- **Supply chain (A03):** `npm audit`, **Dependabot/Renovate**, **Socket**, **Snyk**, **OSV-Scanner**; lockfile integrity; provenance/**SLSA**; guard against typosquatting/hijacking.
- **SAST:** **Semgrep** (rules updated for OWASP 2025), **CodeQL**, `eslint-plugin-security`. **DAST:** **OWASP ZAP**. **Secret scanning:** **gitleaks**, **trufflehog**.
- **ASVS** (OWASP Application Security Verification Standard) as a checklist source for deeper requirements.

### 4.7 Accessibility testing

- **Target: WCAG 2.2 AA.** Stakes are rising: **European Accessibility Act (EAA)** obligations began **28 June 2025**, and **ADA Title II** compliance deadlines for public entities fall in **2026–2027** (largest entities April 2026).
- **Automated tooling:** **axe-core** (via **jest-axe**/**vitest-axe** in unit/integration, **@axe-core/playwright** in E2E), Playwright accessibility snapshot, Storybook a11y addon, Lighthouse a11y, **pa11y**.
- **What automation catches:** Deque's Automated Accessibility Coverage Report (announced March 2021; based on 2,000+ audits, 13,000+ pages, ~300,000 issues) found that *"57.38% of total issues were identified using Deque's automated tests,"* versus *"the widely accepted belief that automated testing only provides 20–30% of accessibility testing coverage."* axe-core's own repo phrases it as finding "on average 57% of WCAG issues automatically." Either way, the remaining ~40–70% (meaningful alt text, logical focus order, caption accuracy, helpful errors) **require human judgment** — say this explicitly in reports; an automated pass ≠ accessible.
- **jsdom limitation:** `color-contrast` returns **"incomplete"** in jsdom (no layout/paint). Run contrast + focus-order checks in **Vitest Browser Mode / Playwright**.
- **Manual testing:** keyboard navigation (everything operable without a mouse), **focus management** and **focus trapping in modals**, screen readers (NVDA/JAWS/VoiceOver), reduced motion (`prefers-reduced-motion`), color contrast, correct ARIA (prefer native semantics; "no ARIA is better than bad ARIA"), **live regions** for async updates, skip links, form labeling and **error announcement** (`role="alert"`).
- **SPA route-change announcements (critical for React Router):** after client-side navigation, move focus to the new page's `<h1>`/main and announce the change via a visually-hidden live region — screen-reader users otherwise get no feedback. Test that focus lands correctly after `<Link>` navigation. See React Router's official "Accessibility" how-to.

### 4.8 Contract testing

- **Consumer-driven with Pact (Pact JS):** the React consumer writes a test against a **Pact mock provider** (`PactV3`), generating a `pact.json` describing the exact requests/responses it needs; publish to a **Pact Broker/PactFlow**; the provider runs **verification** against the contract; **`can-i-deploy`** gates release. Use **matchers** for volatile fields. Eliminates many slow, flaky E2E integration tests. When contract tests beat E2E: verifying cross-service compatibility without spinning up the whole system.
- **Schema-first/OpenAPI:** generate/validate against a spec (Dredd, Schemathesis, Specmatic, Optic). Bidirectional contract testing (PactFlow) reconciles consumer pacts with a provider's OpenAPI.
- **Keep MSW honest:** generate MSW handlers from the OpenAPI spec (`msw-auto-mock`) and/or validate handler responses against Zod schemas derived from the spec, so mocks don't drift from reality.
- **Type-level contracts (complement, not replacement):** shared TS types, **tRPC**, or clients generated from OpenAPI/GraphQL Codegen catch shape mismatches at compile time — but they don't verify runtime behavior, so they complement (not replace) contract tests.

### 4.9 Visual regression testing

- **Chromatic** (Storybook-native), **Percy**, **Playwright `toHaveScreenshot()`**, **Argos**.
- **Flake sources & fixes:** freeze fonts (wait for `document.fonts.ready` / self-host), disable animations (`prefers-reduced-motion` / CSS override), freeze dates/time, mask dynamic regions, pin viewport and device scale, run in the same OS/browser (CI containers) to avoid font-rendering diffs.

### 4.10 Mutation testing
Use **Stryker** periodically (or on changed files in PRs) on critical logic to validate that your assertions actually catch regressions; treat surviving mutants as missing test cases.

### 4.11 Testing in production
Feature flags (decouple deploy from release), **canary releases**, synthetic monitoring, error tracking (**Sentry**), and **RUM** (for field Core Web Vitals). These complement — never replace — pre-production tests; they catch what only real traffic reveals.

---

## 5. Process, CI/CD, and Organization

### 5.1 File organization & naming
- **Colocation** (`Button.tsx` + `Button.test.tsx`) is preferred for unit/component tests — easy to find, moves with the code. Reserve `__tests__/` or a top-level `e2e/` for E2E/integration suites that span modules.
- **`.test.ts` vs `.spec.ts`:** pick one convention and enforce it. Common split: `.test.ts` for unit/component, `.spec.ts` (or an `e2e/` dir) for Playwright.

### 5.2 CI pipeline design
- **Pre-commit (husky + lint-staged):** format, lint, typecheck, and unit-test only changed files. Keep it seconds-fast.
- **On PR:** typecheck, lint, full unit + integration (`vitest run --coverage`), a smoke subset of E2E, a11y checks. **Target < ~10 min PR feedback.** Shard/parallelize; cache `node_modules` and Vite/Vitest caches.
- **On merge/main:** full E2E across browsers (sharded), visual regression, contract verification + `can-i-deploy`.
- **Nightly:** full cross-browser E2E, soak/load (k6), mutation testing, Lighthouse CI trends.
- Make the important checks **required** for merge.

### 5.3 Test impact analysis
Run only affected tests: **`vitest --changed`** (against a git ref), **Nx affected**, **Turborepo** task caching. Essential for monorepos and trunk-based development to keep feedback fast.

### 5.4 Trunk-based development
Short-lived branches, frequent merges to a green trunk, feature flags for incomplete work. Requires a fast, trustworthy test suite and strong test-impact analysis.

### 5.5 Definition of Done & PR review checklist (tests)
DoD includes: tests for new behavior; a regression test if fixing a bug; no decrease in meaningful coverage; a11y checks pass; no new flakies. PR test review: Are behaviors (not implementation) tested? Right query priority? MSW at the boundary? Loading/empty/error covered? No sleeps, no conditional logic, no `getBy` for absence? Deterministic?

### 5.6 Writing a test plan document
Lightweight modern test-plan sections (ISO/IEC/IEEE 29119 heritage, kept lean): **scope & feature summary**, **risk assessment** (likelihood × impact), **what's in/out of scope**, **test approach per layer**, **entry/exit criteria**, **environments & test data**, **key scenarios** (from equivalence/boundary/decision-table analysis), **who owns what**.

### 5.7 Bug-driven testing
Every bug gets a failing test that reproduces it *before* the fix; the fix makes it pass; it stays as a regression guard.

### 5.8 TDD/BDD
- **TDD red-green-refactor:** helps most for well-specified logic and bug fixes; less useful for exploratory UI. The evidence is genuinely mixed but leans positive on defects at a time cost — Nagappan, Maximilien, Bhat & Williams, "Realizing quality improvement through test driven development" (*Empirical Software Engineering* 13:289–302, 2008), studied three Microsoft teams and one IBM team and found *"pre-release defect density of the four products decreased between 40% and 90%"* while teams *"experienced a 15–35% increase in initial development time."* Treat TDD as a useful discipline, not dogma.
- **BDD/Gherkin:** valuable when non-technical stakeholders co-author scenarios; often overhead for a purely engineering team. Use plain `describe/it` unless Gherkin earns its keep.

### 5.9 AI-assisted test generation (pitfalls & how to instruct agents)
Common failure modes when LLMs write tests: **asserting current behavior instead of intended behavior** (characterization tests that lock in bugs), **over-mocking** (mocking the unit under test, producing vacuous tests), **brittle assertions** (exact DOM/snapshot, test IDs everywhere), and **vacuous passes** (`expect(mock).toHaveBeenCalled()` with no behavioral meaning). Instruct agents to: work from the spec/ticket; follow the query-priority and MSW rules above; cover the loading/empty/error/boundary matrix; avoid mocking what they don't own; and prove each test can fail (mutation-test critical logic). This document's §0 hard rules are designed to be pasted into agent context.

---

## 6. Anti-Patterns Catalog

1. **Testing implementation details** — asserting on state, render counts, internal function names, CSS classes. Breaks on refactor.
2. **Over-mocking / mocking what you don't own** — mocking `fetch`/`axios`/third-party SDKs directly instead of MSW; mocking the unit under test. Produces tests that pass while the app is broken.
3. **Snapshot abuse** — giant DOM snapshots blindly updated with `-u`.
4. **Brittle selectors** — `container.querySelector`, CSS/XPath, test IDs everywhere instead of roles.
5. **Assertion-free tests** — render-only "tests" that can't fail meaningfully.
6. **Conditional logic in tests** — `if/for/try`; use `it.each`.
7. **Shared mutable state / order-dependent tests** — leaking a store, a QueryClient, or MSW handlers across tests.
8. **Sleeping instead of waiting** — `setTimeout`/fixed delays instead of `findBy`/`waitFor`/web-first assertions.
9. **Testing the framework/library** — verifying React Router navigates or Zod validates (they have their own tests). Test *your* usage.
10. **100% coverage worship** — gaming coverage with meaningless tests; ignoring mutation score.
11. **Ice-cream cone** — mostly manual/E2E, few unit/integration. Slow and flaky.
12. **Slow suites** — no parallelism/sharding, real network, no test-impact analysis.
13. **Unclear failure messages** — `queryBy` + truthiness checks that report "expected null"; prefer `getBy`/jest-dom matchers with rich errors.
14. **`getBy` for absence checks** — throws; use `queryBy...not.toBeInTheDocument()`.
15. **`act()` misuse** — wrapping things in manual `act` to silence warnings instead of awaiting `userEvent`/`findBy`.
16. **`waitFor` with multiple assertions or side effects** — put a single assertion inside; no `userEvent`/mutations in the callback.
17. **Mocking `useNavigate` and asserting the mock** instead of asserting rendered destination.
18. **Auto-retry culture** — reruns to hide flakiness instead of fixing root causes.

---

## 7. Prompt-style Checklists for Agents

### 7.1 Generate a test PLAN from a feature description
1. Restate the feature and its **acceptance criteria** in your own words.
2. List **risks** (likelihood × impact); mark money/auth/data-loss/legal paths high.
3. Identify **units** (pure logic, loaders/actions, schemas), **components**, **integration flows**, and **critical journeys**.
4. For each input, apply **equivalence partitioning + boundary values**; for combinational logic build a **decision table**; for stateful UI build a **state-transition** list.
5. Enumerate the **UI state matrix**: rendering, interaction, loading, empty, error, success, boundary, accessibility.
6. Choose the **test layer** for each item using the §0 decision table.
7. Define **test data** (factories, seeded faker).
8. Note **entry/exit criteria** and which checks are **required** in CI.

### 7.2 Generate TEST CASES / code
For each item: name states behavior → Arrange (render with proper providers/router; MSW handlers) → Act (`await userEvent`) → Assert (role-based queries, jest-dom matchers). Add negative/error cases (override MSW with `server.use`). Add an a11y assertion (`axe`) where relevant. For loaders/actions, construct a `Request` and assert status/redirect/data. Ensure each test can fail for a real reason.

### 7.3 Router-specific checklist
- Router hooks? → `createRoutesStub` (subcomponent) or `createMemoryRouter`.
- Whole framework-mode route? → Playwright E2E (don't fight `Route.*` types).
- Loader/action? → test as a function; assert redirects/thrown responses/`data()`.
- Navigation? → assert rendered destination / `toHaveURL`, not a mocked `useNavigate`.
- Forms? → submit with `userEvent`; assert `actionData`, pending UI, optimistic value.
- Progressive enhancement / SSR / hydration? → Playwright (JS-disabled context; console hydration errors; content on first paint).
- SPA route change? → assert focus management + live-region announcement.

---

## 8. Glossary
- **AAA / GWT** — Arrange-Act-Assert / Given-When-Then test structure.
- **Arbitrary** — a random data generator in fast-check.
- **createRoutesStub** — React Router utility that provides a test router context for components using router hooks.
- **DataWithResponseInit** — RR7 return type from `data()` carrying value + status/headers.
- **Deflaking / Quarantine** — isolating a non-deterministic test out of the blocking pipeline while it's fixed.
- **INP** — Interaction to Next Paint; CWV responsiveness metric (replaced FID, March 2024).
- **MSW** — Mock Service Worker; network-boundary API mocking.
- **Mutant / Mutation score** — an injected code change / % of mutants killed by tests.
- **Portable stories** — Storybook stories composed for reuse in test runners via `composeStories`.
- **Sociable vs Solitary** — unit test with real vs doubled collaborators.
- **Test double** — umbrella for dummy/fake/stub/spy/mock.
- **Testing Trophy** — Dodds's integration-heavy test-distribution model.
- **VU** — k6 virtual user.

---

## 9. Appendix: Recommended Config Files

### 9.1 `vitest.config.ts` (jsdom + optional browser project)
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    projects: [
      { extends: true, test: { name: "unit", environment: "jsdom" } },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
```

### 9.2 `src/test/setup.ts`
```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

### 9.3 `src/test/msw/server.ts` + handlers
```ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/todos", () =>
    HttpResponse.json([{ id: "1", title: "Learn testing" }]),
  ),
];
export const server = setupServer(...handlers);

// error override example (use inside a test):
// server.use(http.get("/api/todos", () => new HttpResponse(null, { status: 500 })));
```

### 9.4 Custom render with providers
```tsx
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const client = makeClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
```

### 9.5 `playwright.config.ts`
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, dependencies: ["setup"] },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, dependencies: ["setup"] },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 9.6 GitHub Actions — PR workflow
```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npx vitest run --coverage
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium --grep @smoke
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run build
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
  load:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - uses: grafana/run-k6-action@v1
        with: { path: ./load/smoke.js }
```

### 9.7 `stryker.config.json` (Vitest)
```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "incremental": true,
  "thresholds": { "high": 85, "low": 70, "break": 60 }
}
```

---

## Recommendations

**Stage 1 — Foundation (week 1).** Turn on the always-on base: strict TypeScript, `eslint-plugin-testing-library` + `eslint-plugin-jest-dom`. Stand up Vitest 4 (jsdom) + RTL + MSW using the appendix configs, with `onUnhandledRequest: 'error'`. Write a `renderWithProviders` wrapper (QueryClient with `retry: false`, router, theme). Paste §0 hard rules into your AI agents' system context. **Benchmark to advance:** every new PR ships tests; PR feedback < 10 min.

**Stage 2 — Integration depth (weeks 2–4).** Make integration tests the bulk of the suite: component subtree + `createRoutesStub`/`createMemoryRouter` + MSW, covering the loading/empty/error/success matrix. Test loaders/actions as pure functions. Add jest-axe/vitest-axe to component tests. Stand up a thin Playwright E2E smoke suite (login + top 2–3 journeys) with a `storageState` auth setup project. **Benchmark:** critical journeys covered by E2E; a11y assertions on all new components.

**Stage 3 — Hardening (month 2+).** Add Lighthouse CI and k6 (with p95/p99 thresholds) to CI. Introduce Stryker mutation testing on business-critical modules (target mutation score ≥80% there). Add contract tests (Pact or OpenAPI-validated MSW) if you have a separate backend team. Add visual regression (Chromatic/Playwright screenshots) for the design system. Establish a flaky-test **quarantine** policy with named owners and a 2–4 week SLA. **Benchmark:** flaky rate trending toward <1% of runs; mutation score ≥80% on critical logic; Core Web Vitals passing at p75 in RUM.

**Signals that should change the plan:** if unit tests outnumber integration tests and bugs still slip through seams → shift effort up to integration. If E2E is >10–15% of the suite or is flaky → push cases down to integration. If >10% of tests are quarantined → treat it as a test-infrastructure problem, not individual flakes. If coverage is high but Stryker survivors are many → your assertions are weak; fix assertions, don't add coverage.

## Caveats
- **Version churn is real.** React Router is on the v8.x line (docs still cover v7/v6); Vitest 4 is recent (Oct 2025) and Browser Mode, while now "stable," is young — verify exact API names against current docs before relying on edge features. React Server Component unit testing has **no first-class story** yet; test RSC data logic as functions and rendered output via E2E.
- **`createRoutesStub` scope is officially narrow** — it is explicitly *not* for direct testing of framework-mode Route components; respect that boundary or you will fight generated types.
- **Some cited figures come from vendor or practitioner sources**, not primary research: the "~80%/60% mutation-score" bands and several tool-comparison latency numbers are practitioner guidance, not standards. The Google flaky-test stats, the FSE 2014 flakiness-cause study, the Deque 57.38% a11y figure, the Nagappan et al. TDD study, and the fast-check download count are traceable to named primary sources.
- **The 57% automated-a11y figure is methodology-dependent** (Deque's audit-based measurement); other reputable sources cite 30–50%. In all cases, automated testing is necessary but not sufficient — manual and assistive-technology testing remain mandatory for WCAG conformance claims.
- **This document is a starting policy, not a substitute for judgment.** Where practices are contested (TDD value, one-assertion-per-test, sociable vs solitary), it presents tradeoffs deliberately; adapt to your risk profile.

---

## 10. Authoritative Sources
- **Testing Library** — testing-library.com (query priority, guiding principle, jest-dom, user-event).
- **Kent C. Dodds** — kentcdodds.com (Testing Trophy; "Write tests. Not too many. Mostly integration.").
- **Martin Fowler** — martinfowler.com ("UnitTest", "Mocks Aren't Stubs", "TestDouble", "Eradicating Non-Determinism in Tests").
- **Spotify Engineering** — "Testing of Microservices" (Testing Honeycomb), "Test Flakiness".
- **Google Testing Blog / IEEE Software** — Micco, "Flaky Tests at Google and How We Mitigate Them".
- **Uber Engineering** — "Handling Flaky Unit Tests in Java", "Flaky Tests Overhaul at Uber" (Testopedia).
- **Luo et al., FSE 2014** — "An Empirical Analysis of Flaky Tests".
- **React Router** — reactrouter.com (Testing, createRoutesStub, error boundaries, accessibility, security how-tos).
- **Vitest** — vitest.dev (Browser Mode, projects, coverage, mocking).
- **Playwright** — playwright.dev (best practices, locators, trace viewer, auth projects).
- **MSW** — mswjs.io (setupServer, onUnhandledRequest, handlers).
- **Storybook** — storybook.js.org (portable stories, Vitest addon, a11y).
- **TanStack Query** — tanstack.com/query (testing guide).
- **Stryker** — stryker-mutator.io. **fast-check** — fast-check.dev / Snyk Advisor.
- **OWASP** — owasp.org (Top 10:2025, ASVS, ZAP). **Semgrep** — semgrep.dev.
- **W3C/WAI** — WCAG 2.2; **Deque axe-core** — github.com/dequelabs/axe-core; Deque Automated Accessibility Coverage Report (2021).
- **web.dev / Google** — Core Web Vitals (INP), Lighthouse CI (treosh/lighthouse-ci-action).
- **Grafana k6** — grafana.com/docs/k6 (thresholds, test types, setup-k6-action/run-k6-action).
- **Pact** — docs.pact.io (consumer-driven contracts, broker, can-i-deploy).
- **Nagappan, Maximilien, Bhat & Williams (2008)** — "Realizing quality improvement through test driven development", *Empirical Software Engineering*.

*End of document. Extend by adding numbered subsections; keep the §0 hard rules and decision table authoritative for agents.*