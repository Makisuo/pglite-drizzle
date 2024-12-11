import {
	type BuildRelationalQueryResult,
	Column,
	One,
	SQL,
	type TableRelationalConfig,
	type TablesRelationalConfig,
	is,
} from "drizzle-orm"

function mapRelationalRow(
	tablesConfig: TablesRelationalConfig,
	tableConfig: TableRelationalConfig,
	row: unknown[],
	buildQueryResultSelection: BuildRelationalQueryResult["selection"],
	mapColumnValue: (value: unknown) => unknown = (value) => value,
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const [selectionItemIndex, selectionItem] of buildQueryResultSelection.entries()) {
		if (selectionItem.isJson) {
			const relation = tableConfig.relations[selectionItem.tsKey]!
			const rawSubRows = row[selectionItemIndex] as unknown[] | null | [null] | string
			const subRows = typeof rawSubRows === "string" ? (JSON.parse(rawSubRows) as unknown[]) : rawSubRows
			result[selectionItem.tsKey] = is(relation, One)
				? subRows &&
					mapRelationalRow(
						tablesConfig,
						tablesConfig[selectionItem.relationTableTsKey!]!,
						subRows,
						selectionItem.selection,
						mapColumnValue,
					)
				: (subRows as unknown[][]).map((subRow) =>
						mapRelationalRow(
							tablesConfig,
							tablesConfig[selectionItem.relationTableTsKey!]!,
							subRow,
							selectionItem.selection,
							mapColumnValue,
						),
					)
		} else {
			const value = mapColumnValue(row[selectionItemIndex])
			const field = selectionItem.field!
			let decoder: any
			if (is(field, Column)) {
				decoder = field
			} else if (is(field, SQL)) {
				// @ts-expect-error Internal field
				decoder = field.decoder
			} else {
				// @ts-expect-error Internal field
				decoder = field.sql.decoder
			}
			result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value)
		}
	}

	return result
}

export function processQueryResults<T>(query: T, rawRows: any[]): Record<string, any>[] {
	return rawRows.map((row) => {
		return mapRelationalRow(
			(query as any).schema,
			(query as any).tableConfig,
			Object.values(row),
			(query as any)._getQuery().selection,
		)
	})
}
