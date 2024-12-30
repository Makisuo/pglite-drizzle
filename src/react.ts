import { useLiveIncrementalQuery, useLiveQuery, usePGlite } from "@electric-sql/pglite-react"
import { type DrizzleConfig, type ExtractTablesWithRelations, is } from "drizzle-orm"

import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"

import type { SyncShapeToTableOptions, SyncShapeToTableResult } from "@electric-sql/pglite-sync"

import { type PgliteDatabase, drizzle as createPgLiteClient} from "drizzle-orm/pglite"
import {
	type DrizzleQueryType,
	type LiveQueryReturnType,
	type PGLiteWithElectric,
	syncShapeToTable as syncShapeToTableImpl,
} from "./index"
import { processQueryResults } from "./relation-query-parser"

/**
 * Return type for the createDrizzle function providing type-safe Electric SQL hooks with DrizzleORM integration.
 * @template TSchema The DrizzleORM schema type defining your database tables and relations
 */
type CreateDrizzleReturnType<TSchema extends Record<string, unknown>> = {
	/**
	 * Hook for type-safe reactive queries that re-render when data changes.
	 * Combines DrizzleORM's type inference with Electric SQL's live query functionality.
	 *
	 * @example
	 * ```ts
	 * const { data } = useDrizzleLive((db) =>
	 *   db.select().from(schema.users)
	 * );
	 * ```
	 *
	 * @template T - The DrizzleORM query type
	 * @param fn - Function that receives the typed database instance and returns a DrizzleORM query
	 * @returns {LiveQueryReturnType<T>} Typed query results that update reactively
	 */
	useDrizzleLive: <T extends DrizzleQueryType>(fn: (db: PgliteDatabase<TSchema>) => T) => LiveQueryReturnType<T>

	/**
	 * Hook for type-safe reactive queries with incremental updates.
	 * Uses Electric SQL's incremental updates for better performance while maintaining DrizzleORM's type safety.
	 *
	 * @example
	 * ```ts
	 * const { data } = useDrizzleLiveIncremental("id", (db) =>
	 *   db.select().from(schema.users)
	 * );
	 * ```
	 *
	 * @template T - The DrizzleORM query type
	 * @param diffKey - Column name used for tracking incremental changes
	 * @param fn - Function that receives the typed database instance and returns a DrizzleORM query
	 * @returns {LiveQueryReturnType<T>} Typed query results that update incrementally
	 */
	useDrizzleLiveIncremental: <T extends DrizzleQueryType>(
		diffKey: string,
		fn: (db: PgliteDatabase<TSchema>) => T,
	) => LiveQueryReturnType<T>

	/**
	 * Type-safe wrapper around Electric SQL's syncShapeToTable utility.
	 * Ensures table and primary key names match your DrizzleORM schema.
	 *
	 * This function provides type checking for table names and primary keys against your schema,
	 * while defaulting the shape's table parameter to the local table name if not specified.
	 *
	 * @example
	 * ```ts
	 * await syncShapeToTable(pg, {
	 *   table: 'users',        // Must match a table in your schema
	 *   primaryKey: 'id',      // Must match a column in the users table
	 *   shape: {
	 *     params: {
	 *       // table parameter will default to 'users' if not specified
	 *     }
	 *   },
	 *   shapeKey: 'myShape'
	 * });
	 * ```
	 *
	 * @template TTableKey - Table name from your DrizzleORM schema
	 * @template TPrimaryKey - Primary key column from the specified table
	 * @param pg - Electric SQL's PGLite instance with electric extensions
	 * @param options - Configuration object containing:
	 *   - table: The table name from your schema
	 *   - primaryKey: The primary key column name from the specified table
	 *   - shape: Electric SQL shape configuration
	 *   - shapeKey: Unique identifier for the shape
	 * @returns {Promise<SyncShapeToTableResult>} Result of the sync operation
	 */
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

	/**
	 * Hook to access the DrizzleORM-wrapped PGLite database instance.
	 * Provides type-safe access to your database schema.
	 *
	 * @returns {PgliteDatabase<TSchema>} Typed DrizzleORM database instance
	 */
	useDrizzlePGlite: () => PgliteDatabase<TSchema>
}

/**
 * Creates a type-safe DrizzleORM client integrated with Electric SQL's reactive capabilities.
 *
 * This function combines DrizzleORM's type inference with Electric SQL's live query functionality,
 * providing hooks that maintain type safety while enabling reactive database queries.
 *
 * @example
 * ```ts
 * const { useDrizzleLive } = createDrizzle({
 *   schema: {
 *     users: {
 *       id: serial('id').primaryKey(),
 *       name: text('name'),
 *     }
 *   }
 * });
 *
 * // Later in a component:
 * const { data } = useDrizzleLive((db) =>
 *   db.select().from(schema.users)
 * ); // data is fully typed based on your schema
 * ```
 *
 * @template TSchema - Your DrizzleORM schema type
 * @param {DrizzleConfig<TSchema>} config - DrizzleORM configuration with your schema
 * @returns {CreateDrizzleReturnType<TSchema>} Type-safe hooks for reactive database queries
 */
export function createDrizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
	config: DrizzleConfig<TSchema>,
): CreateDrizzleReturnType<TSchema> {
	const useLiveQuery = <T extends DrizzleQueryType>(fn: (db: PgliteDatabase<TSchema>) => T) => {
		const drizzle = useDrizzlePGlite(config)
		const query = fn(drizzle)
		return useDrizzleLive<T>(query)
	}

	const useLiveIncrementalQuery = <T extends DrizzleQueryType>(
		diffKey: string,
		fn: (db: PgliteDatabase<TSchema>) => T,
	) => {
		const drizzle = useDrizzlePGlite(config)
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
		useDrizzlePGlite: () => useDrizzlePGlite(config)
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

/**
 * Hook to access the raw DrizzleORM client instance.
 *
 * @example
 * ```ts
 * const db = useDrizzlePGlite();
 * // Use db directly for custom queries
 * ```
 *
 * @template TSchema - The database schema type
 * @param config - Drizzle configuration object
 * @returns {PgliteDatabase<TSchema>} The configured DrizzleORM database instance
 */
export const useDrizzlePGlite = <TSchema extends Record<string, unknown>>(
	config: DrizzleConfig<TSchema>
): PgliteDatabase<TSchema> => {
	const pg = usePGlite()
	return createPgLiteClient<TSchema>(pg as any, config)
}