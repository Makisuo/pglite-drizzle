import type { LiveQueryResults } from "@electric-sql/pglite/live"
import type { AnyPgSelect, AnyPgSelectQueryBuilder, PgSelectWithout } from "drizzle-orm/pg-core"
import type { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"

export type DrizzleQueryType =
	| PgRelationalQuery<unknown>
	| AnyPgSelect
	| PgSelectWithout<AnyPgSelectQueryBuilder, boolean, any>

export type LiveQueryReturnType<T> = { data: Awaited<T> } & Omit<LiveQueryResults<unknown>, "rows">
