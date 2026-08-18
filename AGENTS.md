# Altinn Service Catalogue - Project Memory

## Overview
Full-stack web app for browsing/searching public digital services (Altinn ecosystem).

## Tech Stack
- **Backend**: ASP.NET Core (.NET 10.0), C# 13, OpenAPI/Swagger, SPA Proxy
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7.3 + Tailwind CSS 3.4
- **Deploy**: GitHub Actions → Azure Web App (windows-latest)
- **Auth Contracts**: Altinn.Authorization.Api.Contracts (shared DTOs)

## Key Paths
- Solution: `src/AltinnServiceCatalogue/AltinnServiceCatalogue.slnx`
- Backend: `src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/`
- Frontend: `src/AltinnServiceCatalogue/altinnservicecatalogue.client/`
- Contracts: `src/AltinnServiceCatalogue/Altinn.Authorization.Api.Contracts/`
- CI/CD: `.github/workflows/AltinnServiceCatalogue.yml`

## Dev Ports
- Backend HTTP: localhost:5016, HTTPS: localhost:7013
- Frontend Vite dev: localhost:64497 (HTTPS, auto-certs)

## Architecture
- Backend serves React SPA as static assets with fallback to index.html
- Vite proxies `/api` to backend API in dev
- Frontend: single App.tsx with sample service data, multi-criteria filtering
- Tailwind dark mode support, responsive grid layout
- Path alias: `@` → `./src` in Vite config
- Designsystemet (@digdir/designsystemet-react) installed for UI components

## Resource Registry Proxy
- Controller: `Controllers/ResourceRegistryController.cs` at route `api/v1/{environment}/resource`
- Service: `Services/ResourceRegistryClient.cs` (IResourceRegistryClient interface)
- Config: `Configuration/ResourceRegistryOptions.cs` bound from `ResourceRegistry` section in appsettings
- Environments: tt02 → platform.tt02.altinn.no, prod → platform.altinn.no
- Endpoints: resourcelist, {id}, search, bysubject, orgs, {id}/policy, {id}/policy/subjects
- Policy endpoints use raw stream pass-through to avoid UrnJsonTypeValue serialization issues

## MCP Server (`altinn`) + Skills
- Project: `AltinnServiceCatalogue.McpServer` (stdio); registered in root `.mcp.json` as server `altinn`.
- Every tool takes an optional `environment` arg: **defaults to `prod`** (`platform.altinn.no`); pass `tt02`
  (`platform.tt02.altinn.no`) **only when the user explicitly asks**. Resolved per call in `AltinnApiClient.BaseUrlFor`.
- Tools live in `AltinnTools.cs`, HTTP in `AltinnApiClient.cs`.
- C# tool method names are exposed as snake_case (e.g. `GetResource` → `get_resource`).
- NL-friendly convenience tools (resolve names → ids/URNs, return concise/enriched shapes):
  `find_resources`, `find_access_packages`, `find_roles`, `get_resource_access_packages`,
  `get_resource_roles`, `get_access_package_resources`. Lower-level raw tools also exist.
- Restart/reconnect the MCP server after changing tools (it rebuilds via `dotnet run` on launch).
- Question-answering skills in `.Codex/skills/`: `altinn-catalogue` (router/overview),
  `altinn-resource-access`, `altinn-subject-access`, `altinn-access-packages`, `altinn-roles`,
  `altinn-resource-lookup`. Each documents the resolve-name-first recipe and which tools to chain.
## Policy Statistics
- Shared scanner and DTOs: `AltinnServiceCatalogue.PolicyStatistics/`; both the web API and MCP server use it.
- Web endpoint: `GET api/v1/{environment}/resource/policy/statistics`.
- The scan reuses the cached full resource list, fetches policies with bounded concurrency of 8, treats 404 as no policy,
  reports fetch and parse failures separately, and caps the non-default drilldown at 500 resources.
- Web aggregates are coalesced and cached in `IMemoryCache` for 30 minutes.
- MCP tool: `get_policy_statistics`; like every MCP tool it defaults to production unless `tt02` is explicit.
