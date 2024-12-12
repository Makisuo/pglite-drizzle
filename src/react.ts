import { useLiveIncrementalQuery, useLiveQuery, usePGlite } from "@electric-sql/pglite-react"
import { type DrizzleConfig, type ExtractTablesWithRelations, is } from "drizzle-orm"

import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"

import type { SyncShapeToTableOptions, SyncShapeToTableResult } from "@electric-sql/pglite-sync"

import type { PGlite } from "@electric-sql/pglite"
import { type PgliteDatabase, drizzle as createPgLiteClient } from "drizzle-orm/pglite"
import {
	type DrizzleQueryType,
	type LiveQueryReturnType,
	type PGLiteWithElectric,
	syncShapeToTable as syncShapeToTableImpl,
} from "./index"
import { processQueryResults } from "./relation-query-parser"

type CreateDrizzleReturnType<TSchema extends Record<string, unknown>> = {
	useDrizzleLive: <T extends DrizzleQueryType>(fn: (db: PgliteDatabase<TSchema>) => T) => LiveQueryReturnType<T>
	useDrizzleLiveIncremental: <T extends DrizzleQueryType>(
		diffKey: string,
		fn: (db: PgliteDatabase<TSchema>) => T,
	) => LiveQueryReturnType<T>

	syncShapeToTable: <
		TTableKey extends keyof ExtractTablesWithRelations<TSchema>,
		TPrimaryKey extends keyof ExtractTablesWithRelations<TSchema>[TTableKey]["columns"],
	>(
		pg: PGLiteWithElectric,
		options: {
			table: TTableKey
			primaryKey: TPrimaryKey
		} & Omit<SyncShapeToTableOptions, "table" | "primaryKey">,
	) => Promise<SyncShapeToTableResult>
}

/**
 * Helper function to create all function with hooks configured with your drizzle client config and schema types.
 * @param config Drizzle Config object
 */
export function createDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
	config: DrizzleConfig<TSchema>,
): CreateDrizzleReturnType<TSchema> {
	const useLiveQuery = <T extends DrizzleQueryType>(fn: (db: PgliteDatabase<TSchema>) => T) => {
		const pg = usePGlite()

		const drizzle = createPgLiteClient<TSchema>(pg as any, config)
		const query = fn(drizzle)

		return useDrizzleLive<T>(query)
	}

	const useLiveIncrementalQuery = <T extends DrizzleQueryType>(
		diffKey: string,
		fn: (db: PgliteDatabase<TSchema>) => T,
	) => {
		const pg = usePGlite()

		const drizzle = createPgLiteClient<TSchema>(pg as any, config)
		const query = fn(drizzle)

		return useDrizzleLiveIncremental<T>(diffKey, query)
	}

	const syncShapeToTable = <
		TTableKey extends keyof ExtractTablesWithRelations<TSchema>,
		TPrimaryKey extends keyof ExtractTablesWithRelations<TSchema>[TTableKey]["columns"],
	>(
		pg: PGLiteWithElectric,
		options: {
			table: TTableKey
			primaryKey: TPrimaryKey
		} & Omit<SyncShapeToTableOptions, "table" | "primaryKey">,
	) => {
		return syncShapeToTableImpl<TSchema, TTableKey, TPrimaryKey>(pg, options)
	}

	return {
		useDrizzleLive: useLiveQuery,
		useDrizzleLiveIncremental: useLiveIncrementalQuery,
		syncShapeToTable,
	}
}

function createQueryResult<T extends DrizzleQueryType>(
	mappedRows: Record<string, any>[],
	mode: "many" | "one",
	items?: { affectedRows?: number; fields?: any[]; blob?: any },
): LiveQueryReturnType<T> {
	return {
		data: (mode === "many" ? mappedRows : mappedRows[0] || undefined) as Awaited<T>,
		affectedRows: items?.affectedRows || 0,
		fields: items?.fields || [],
		blob: items?.blob,
	}
}

/**
 * Enables you to reactively re-render your component whenever the results of a live query change.
 * ```ts
 * const { data } = useDrizzleLive(db.select().from(schema.users).where(eq(schema.users.id, 1)))
 * // or
 * const { data } = useDrizzleLive(db.query.user.findMany({
 * 	where: (table, {eq}) => eq(table.id, 1),
 * }))
 * ```
 *
 * @param query Your drizzle query. This can be a normal select query, insert query, update query or relational query.
 */
export const useDrizzleLive = <T extends DrizzleQueryType>(query: T): LiveQueryReturnType<T> => {
	const sqlData = (query as any).toSQL()
	const items = useLiveQuery(sqlData.sql, sqlData.params)

	if (is(query, PgRelationalQuery)) {
		const mode = (query as any).mode
		const mappedRows = processQueryResults(query, items?.rows || [])

		return createQueryResult<T>(mappedRows, mode, items)
	}

	return createQueryResult<T>(items?.rows || [], "many", items)
}

/**
 * Enables you to reactively re-render your component whenever the results of a live query change.
 * This hook is better for reactivity since it incrementally updates changes.
 *
 * ```ts
 * const { data } = useDrizzleLiveIncremental("id", db.select().from(schema.users).where(eq(schema.users.id, 1)))
 * ```
 *
 * @param diffKey The key to use for incremental updates. This should be a unique identifier for the query. In most cases the table `id`
 * @param query Your drizzle query. This can be a normal select query, insert query, update query or relational query.
 */
export const useDrizzleLiveIncremental = <T extends DrizzleQueryType>(
	diffKey: string,
	query: T,
): LiveQueryReturnType<T> => {
	const sqlData = (query as any).toSQL()

	const items = useLiveIncrementalQuery(sqlData.sql, sqlData.params, diffKey)

	if (is(query, PgRelationalQuery)) {
		const mode = (query as any).mode
		const mappedRows = processQueryResults(query, items?.rows || [])

		return createQueryResult<T>(mappedRows, mode, items)
	}

	return createQueryResult<T>(items?.rows || [], "many", items)
}
