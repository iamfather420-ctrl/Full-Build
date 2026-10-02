# SolveX Monorepo Architecture & Setup Guide

## Architecture Overview
This repository operates as a **pnpm + Turborepo Sovereign Monorepo**. It manages multi-language packages, sub-applications, and autonomous node artifacts under unified orchestration.

### Workspaces
- `apps/*`: Sub-applications (Web dashboards, Mobile webviews, Microservices).
- `packages/*`: Shared utilities, UI component libraries, and SDKs (`@packages/*`).
- `workspace_temp/*`: Dynamic node build outputs, binary extractions, and temporary polyglot compilation outputs (`@nodes/*`).

---

## Configuration Files

### `pnpm-workspace.yaml`
Defines root workspace members:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'workspace_temp/*'
```

### `turbo.json`
Configures Turborepo build pipeline, caching, and task dependencies:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### `tsconfig.json` Path Aliases
Path resolution mappings configured across the monorepo:
- `@/*`: Root level imports
- `@nodes/*`: Dynamic workspace temporary builds
- `@packages/*`: Shared monorepo packages
- `@apps/*`: Application packages

---

## Command Reference

| Command | Action |
| --- | --- |
| `pnpm install` | Install all dependencies across workspace packages |
| `pnpm build` or `npm run build` | Execute Turbo build pipeline across all workspace apps & packages |
| `pnpm dev` or `npm run dev` | Launch local development server on port 3000 |
| `pnpm lint` or `npm run lint` | Execute type-checking across TypeScript targets |
