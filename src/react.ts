import { useLiveIncrementalQuery, useLiveQuery } from "@electric-sql/pglite-react"
import {
	type BuildRelationalQueryResult,
	Column,
	One,
	SQL,
	type TableRelationalConfig,
	type TablesRelationalConfig,
	is,
} from "drizzle-orm"
import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"

import type { DrizzleQueryType, LiveQueryReturnType } from "./index"
import { processQueryResults } from "./relation-query-parser"

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
 *
 * @param query Your drizzle query. This can be a noraml select query, insert query, update query or relational query.
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
 * @param diffKey The key to use for incremental updates. This should be a unique identifier for the query. In most cases the table `id`
 * @param query Your drizzle query. This can be a noraml select query, insert query, update query or relational query.
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
