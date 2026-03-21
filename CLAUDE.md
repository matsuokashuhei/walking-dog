# walking-dog — Monorepo

## Directory Structure

```
walking-dog/
├── apps/       # Deployable applications (depend on packages/)
│   ├── api/    # Backend API
│   ├── mobile/ # React Native / Expo app
│   └── web/    # Web frontend
├── docs/       # Design documents and specs
├── infra/      # Cloud infrastructure (IaC)
├── packages/   # Shared libraries used by apps/
│   ├── ui/     # (future) Shared UI components
│   ├── types/  # (future) Shared TypeScript types
│   └── utils/  # (future) Shared utilities
└── README.md
```
