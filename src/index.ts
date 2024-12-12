import type { PGlite } from "@electric-sql/pglite"
import type { SyncShapeToTableOptions, SyncShapeToTableResult } from "@electric-sql/pglite-sync"
import type { LiveQueryResults } from "@electric-sql/pglite/live"
import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { AnyPgSelect, AnyPgSelectQueryBuilder, PgSelectWithout } from "drizzle-orm/pg-core"
import type { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"

export type DrizzleQueryType =
	| PgRelationalQuery<unknown>
	| AnyPgSelect
	| PgSelectWithout<AnyPgSelectQueryBuilder, boolean, any>

export type LiveQueryReturnType<T> = { data: Awaited<T> } & Omit<LiveQueryResults<unknown>, "rows">

export type PGLiteWithElectric = PGlite & {
	electric: {
		initMetadataTables: () => Promise<void>
		syncShapeToTable: (options: SyncShapeToTableOptions) => Promise<SyncShapeToTableResult>
	}
}

/**
 * Helper function to typesafe sync a shape to a table in pglite.
 * @param pgLite PGLite Client
 * @param options
 * @returns
 */
export const syncShapeToTable = <
	TSchema extends Record<string, unknown>,
	TTableKey extends keyof ExtractTablesWithRelations<TSchema>,
	TPrimaryKey extends keyof ExtractTablesWithRelations<TSchema>[TTableKey]["columns"],
>(
	pgLite: PGLiteWithElectric,
	options: {
		table: TTableKey
		primaryKey: TPrimaryKey
	} & Omit<SyncShapeToTableOptions, "table" | "primaryKey">,
): Promise<SyncShapeToTableResult> => {
	return pgLite.electric.syncShapeToTable({
		shape: {
			...options.shape,
			params: {
				...options.shape.params,
				// Default to local table if not specified
				table: options.shape.params?.table || (options.table as string),
			},
		},
		table: options.table as string,
		primaryKey: [options.primaryKey as string],
		shapeKey: options.shapeKey,
	})
}
