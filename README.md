# PG-Lite Drizzle

This is a simple package to integrate drizzle with pglite, and electric.

## Getting Started

### Install

```bash
npx jsr add @makisuo/pglite-drizzle

```

### Usage

```tsx
import { createDrizzle } from "@makisuo/pglite-drizzle"

export const { useDrizzleLive, useDrizzleLiveIncremental } = createDrizzle({ schema })
```

```tsx
import { useDrizzleLive } from "./drizzle-client.ts"

const { data } = useDrizzleLive((db) =>
        db.query.accounts.findMany({
            with: {
                institution: true,
            },
        }),
)
```
