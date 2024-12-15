# Getting Started

This page demonstrates some of the built-in markdown extensions provided by VitePress.

## Installation

::: code-group

```sh [npm]
$ npx jsr add @makisuo/pglite-drizzle

```

```sh [pnpm]
$ pnpm dx jsr add @makisuo/pglite-drizzle
```

```sh [yarn]
$ yarn dlx jsr add @makisuo/pglite-drizzle
```

```sh [bun]
$ bunx jsr add @makisuo/pglite-drizzle
```

## Usage



### Setup

```tsx drizzle-client.ts
import { createDrizzle } from "@makisuo/pglite-drizzle"

export const { useDrizzleLive, useDrizzleLiveIncremental } = createDrizzle({ schema })
```

### Usage
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




