# Agify API Tests (Cucumber + TypeScript + nock)

This project contains end-to-end style tests for the Agify API implemented as Cucumber feature files and TypeScript step definitions. Tests are mocked with `nock` so they run deterministically in CI without hitting the real API.

Contents
- features/agify-api.feature — Gherkin scenarios describing expected behavior.
- features/step_definitions/agify.steps.ts — TypeScript step definitions (uses axios + nock).
- package.json — test script and dependency list.
- tsconfig.json — TypeScript configuration for tests.
- .github/workflows/ci.yml — GitHub Actions workflow that runs tests on push / PR.

Prerequisites
- Node.js (recommended v18.x) and npm
- Git (to run the repository commands)

Quick start (local)
1. From the repository root, install dependencies:
   npm ci

2. Run the full test suite:
   npm test

3. Run a single feature file (useful for quick debugging):
   npx cucumber-js features/agify-api.feature --require-module ts-node/register --require features/step_definitions/agify.steps.ts

Notes about the test runner
- The test script in package.json uses:
  cucumber-js --require-module ts-node/register --require features/step_definitions/**/*.ts --publish-quiet
  so Cucumber is executed with ts-node to run TypeScript step definitions directly.

How the mocks work
- The TypeScript Before hook in features/step_definitions/agify.steps.ts configures `nock` and calls `nock.disableNetConnect()` — this intentionally prevents real HTTP requests so all tests use mocked responses.
- Mocks included:
  - Single-name mock (e.g. "edzelle" / "michael")
  - Unknown name returning age = null (e.g. "zzzzzzzz")
  - Multi-name (name[] query) returning an array
  - Rate-limit simulation where the first response is 429 with Retry-After, followed by a 200
- To run tests against the live API (not recommended for CI), remove or modify the nock setup and ensure external network is allowed.

Running in CI
- The GitHub Actions workflow (.github/workflows/ci.yml) uses Node 18, runs `npm ci` and `npm test`. No extra secrets are required because network calls are mocked.

Project structure and adding tests
- Place feature files under:
  features/*.feature
