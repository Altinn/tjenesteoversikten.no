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
