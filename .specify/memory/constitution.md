# Altinn Service Catalogue Constitution

## Core Principles

### I. Preserve the catalogue and proxy boundaries

The application browses public Altinn service and authorization metadata. Keep
ASP.NET Core responsible for upstream HTTP communication, environment resolution,
caching, and policy processing. The React client uses the application's `/api`
surface. Keep controllers thin and reuse the existing service abstractions rather
than introducing duplicate integration paths. The stdio MCP server may call the
public Altinn APIs directly through its existing client.

### II. Keep environment selection explicit

Preserve the existing `prod` and `tt02` configuration and environment-scoped web
routes. Every MCP tool MUST default to `prod`; use `tt02` only when the user
explicitly requests it. Propagate the selected environment consistently through
upstream requests and cache keys. A missing response or upstream failure MUST NOT
silently cause a switch to another environment.

### III. Preserve contracts and policy fidelity

Reuse `Altinn.Authorization.Api.Contracts` for shared authorization DTOs and
`AltinnServiceCatalogue.PolicyStatistics` for statistics shared by the API and
MCP server. Preserve public routes, identifiers, URNs, response semantics, and
existing client behavior unless the feature explicitly requires a change; state
compatibility effects in its specification and plan.

Keep raw pass-through behavior for policy payloads where deserialization and
reserialization can change or break `UrnJsonTypeValue` data. Policy statistics
must continue to distinguish missing policies, fetch failures, and parse failures.
Preserve bounded upstream concurrency, caching/coalescing, and drilldown limits
unless the change explains and verifies an alternative. Current scanner settings
are concurrency 8, a 30-minute web aggregate cache, and a maximum 500-resource
non-default drilldown.

### IV. Build on the existing frontend and deployment model

Use the existing React/TypeScript/Vite application, Tailwind styling, and Digdir
Designsystemet components and conventions. Preserve responsive layouts, dark-mode
behavior, and existing navigation and filtering when working on adjacent features.
Read the actual project manifests for dependency versions rather than relying on
older prose: at adoption, the frontend uses React 19, TypeScript 5.9, Vite 7, and
Tailwind 4. Backend projects target .NET 10.

Keep the SPA static-asset/fallback model and the Vite `/api` development proxy.
Account for the existing GitHub Actions build and Azure Web App deployment when
changing build outputs or runtime configuration.

### V. Verify the behavior being changed

Choose verification according to the change and report what actually ran.
Frontend code changes should pass the relevant lint and production-build checks.
Backend, MCP, contract, and statistics changes should build the affected projects
and include targeted verification of changed behavior. Add regression tests where
they meaningfully protect a bug fix or substantial behavior; do not require a new
test framework for documentation or other low-impact setup changes.

The existing CI calls `dotnet test`, but there are no dedicated test projects at
adoption. Do not equate an empty successful test run with functional coverage.
For policy or environment changes, verify failure handling and environment
isolation as well as successful responses. Document unavailable checks and
remaining uncertainty accurately.

## Project Context

- Solution: `src/AltinnServiceCatalogue/AltinnServiceCatalogue.slnx`.
- Server: `src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/`.
- Frontend: `src/AltinnServiceCatalogue/altinnservicecatalogue.client/`.
- MCP server: `src/AltinnServiceCatalogue/AltinnServiceCatalogue.McpServer/`.
- Shared contracts and statistics remain in their existing sibling projects.
- Operational project instructions are in `AGENTS.md`; the user guide and upstream
  API overview are in `README.md`.
- Existing Altinn question-answering skills remain in `.agents/skills/altinn-*/`.
  Reconnect the MCP server after changing its tools.

## Development Workflow

Use Spec Kit for a bounded feature or fix. Write user outcomes, acceptance
scenarios, environment behavior, and relevant compatibility constraints in
`spec.md`. Ground the plan in the existing implementation and check it against
these principles. Create actionable tasks, check artifact consistency, implement,
and verify the result. Keep specifications and implementation aligned as the
scope changes; record remaining work rather than claiming completion early.

Feature artifacts belong under `specs/` and should be reviewed with their code.
The detailed command sequence and local CLI setup are in `docs/spec-kit.md`.
Use the existing Git workflow with `codex/` for new agent branches. Spec Kit's
optional Git extension is not installed. Installation alone does not create a
specification for the whole application or authorize a deployment.

## Governance

This document records repository-specific principles for Spec Kit planning and
analysis. It complements `AGENTS.md` and does not override explicit user
instructions. It is grounded in the existing project instructions, README,
project manifests, and CI configuration, not additional organizational policy.

When a principle changes, explain the reason and impact in the same change and
reconcile affected plans, templates, and documentation. Use semantic versioning
for this document: major for incompatible principle changes, minor for new or
materially expanded principles, patch for clarifications. Update the amendment
date whenever the constitution changes. Explain a justified departure in the
feature plan instead of silently ignoring a principle.

**Version**: 1.0.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-09-08
