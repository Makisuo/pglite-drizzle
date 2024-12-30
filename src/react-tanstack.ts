/**
 * Experimental TanStack Query integration for ElectricSQL + Drizzle, inspired by PowerSync's approach.
 *
 * These hooks wrap ElectricSQL's live queries (useDrizzleLive, useDrizzleLiveIncremental) in TanStack Query
 * so that you can benefit from caching, suspense, and additional TanStack Query features.
 *
 * @example
 * ```tsx
 * // In your top-level file (e.g., App.tsx):
 * import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 *
 * const App = () => {
 *   const queryClient = React.useMemo(() => new QueryClient(), []);
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <YourComponents />
 *     </QueryClientProvider>
 *   );
 * };
 * ```
 *
 * @example
 * ```tsx
 * // Example usage:
 * import { useDrizzleTanstackLive } from "./react-tanstack";
 *
 * function MyComponent() {
 *   // "queryKey" is used for caching & invalidation in TanStack Query
 *   // "drizzleQuery" is the DrizzleORM/ElectricSQL query object you would normally pass to useDrizzleLive
 *   const { data, isLoading, error } = useDrizzleTanstackLive({
 *     queryKey: ["users", "byId", 1],
 *     drizzleQuery: db => db.select().from(schema.users).where(eq(schema.users.id, 1)),
 *   });
 *
 *   if (isLoading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {(error as Error).message}</p>;
 *   return <pre>{JSON.stringify(data, null, 2)}</pre>;
 * }
 * ```
 */

import * as React from "react";
import {
	useQuery as useTanstackQuery,
	useSuspenseQuery as useTanstackSuspenseQuery,
	type QueryClient,
	useQueryClient,
	type UseQueryOptions,
	type UseQueryResult,
	type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useDrizzleLive, useDrizzleLiveIncremental } from "./react";
import type { DrizzleQueryType } from "./index";

/**
 * Shared options for wrapping Drizzle live queries with TanStack Query.
 */
export interface UseDrizzleTanstackOptions<TData> extends Omit<UseQueryOptions<TData>, "queryKey" | "queryFn"> {
	/**
	 * The "queryKey" used by TanStack Query for caching and invalidation.
	 */
	queryKey: readonly unknown[];

	/**
	 * A callback that receives the typed drizzle database instance and returns a Drizzle query
	 * or the Drizzle query object itself. This is what you'd normally pass to:
	 *   useDrizzleLive((db) => db.select().from(schema.users))
	 */
	drizzleQuery: DrizzleQueryType | ((...args: any[]) => DrizzleQueryType);

	/**
	 * If using incremental live queries, specify the "diffKey" used for incremental changes.
	 */
	diffKey?: string;
}

/**
 * A core function that wraps either useDrizzleLive or useDrizzleLiveIncremental in TanStack Query.
 * This is not exported directly; use "useDrizzleTanstackLive" or "useDrizzleTanstackLiveIncremental" instead.
 */
function useDrizzleTanstackCore<TData>(
	options: UseDrizzleTanstackOptions<TData>,
	queryClient: QueryClient,
	useSuspense: boolean,
	incremental: boolean,
): UseQueryResult<TData> | UseSuspenseQueryResult<TData> {
	const { queryKey, drizzleQuery, diffKey, ...tanstackOptions } = options;

	// Resolve drizzleQuery if it's a function
	const resolvedQuery = React.useMemo<DrizzleQueryType>(() => {
		return typeof drizzleQuery === "function" ? (drizzleQuery as any)() : drizzleQuery;
	}, [drizzleQuery]);

	// Retrieve data from ElectricSQL's live queries
	const liveResult = incremental
		? useDrizzleLiveIncremental(diffKey!, resolvedQuery)
		: useDrizzleLive(resolvedQuery);

	const { data: electricData, ...rest } = liveResult;

	// Only setQueryData if electricData reference is different
	React.useEffect(() => {
		const cached = queryClient.getQueryData<TData>(queryKey);
		if (cached !== electricData && electricData !== undefined) {
			queryClient.setQueryData<TData>(queryKey, electricData as TData);
		}
	}, [electricData, queryClient, queryKey]);

	// For the actual queryFn, we can simply return the data we have set in the cache.
	// Because ElectricSQL is already powering reactivity, the main benefit is that
	// other TanStack Query features (like suspense, staleTime, or other caching) can be used.
	const queryFn = React.useCallback(async (): Promise<TData> => {
		return electricData as TData;
	}, [electricData]);

	/**
	 * For suspense or normal usage, we can branch to the appropriate TanStack hook.
	 * The "queryFn" is somewhat trivial here because ElectricSQL already does live updates,
	 * but we need a queryFn for TanStack to be satisfied.
	 */
	if (useSuspense) {
		// note: useTanstackSuspenseQuery returns a slightly different type than useTanstackQuery
		return useTanstackSuspenseQuery<TData>({
			...(tanstackOptions as any),
			queryKey,
			queryFn,
			initialData: electricData,
		}) as UseSuspenseQueryResult<TData>;
	} else {
		return useTanstackQuery<TData>({
			...tanstackOptions,
			queryKey,
			queryFn,
			initialData: electricData,
		});
	}
}

/**
 * A hook that wraps ElectricSQL's useDrizzleLive with TanStack Query, returning
 * a standard TanStack query result. This means you get both reactivity from ElectricSQL
 * AND TanStack Query features like caching, staleTime, or suspending (if you prefer).
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDrizzleTanstackLive({
 *   queryKey: ["users"],
 *   drizzleQuery: db => db.select().from(schema.users),
 *   staleTime: 10000,
 * });
 * ```
 */
export function useDrizzleTanstackLive<TData = unknown>(
	options: UseDrizzleTanstackOptions<TData>,
	queryClient: QueryClient = useQueryClient(),
): UseQueryResult<TData> {
	return useDrizzleTanstackCore<TData>(options, queryClient, false, false) as UseQueryResult<TData>;
}

/**
 * Same as useDrizzleTanstackLive, but uses TanStack Query's suspense mode.
 * If you want React to suspend while data is loading, use this hook.
 *
 * @example
 * ```tsx
 * const { data } = useDrizzleTanstackLiveSuspense({
 *   queryKey: ["users"],
 *   drizzleQuery: db => db.select().from(schema.users),
 * });
 * // in a parent component:
 * // <Suspense fallback={<div>Loading...</div>}></Suspense>
 * ```
 */
export function useDrizzleTanstackLiveSuspense<TData = unknown>(
	options: UseDrizzleTanstackOptions<TData>,
	queryClient: QueryClient = useQueryClient(),
): UseSuspenseQueryResult<TData> {
	return useDrizzleTanstackCore<TData>(options, queryClient, true, false) as UseSuspenseQueryResult<TData>;
}

/**
 * A hook that wraps ElectricSQL's useDrizzleLiveIncremental in TanStack Query.
 * This is useful for incremental updates, especially if you have a large dataset
 * you want to keep "live" while still benefiting from TanStack Query's caching features.
 *
 * @example
 * ```tsx
 * const { data } = useDrizzleTanstackLiveIncremental({
 *   queryKey: ["largeDataTable"],
 *   drizzleQuery: db => db.select().from(schema.largeTable),
 *   diffKey: "id", // must match the unique key used for incremental updates
 * });
 * ```
 */
export function useDrizzleTanstackLiveIncremental<TData = unknown>(
	options: UseDrizzleTanstackOptions<TData> & { diffKey: string },
	queryClient: QueryClient = useQueryClient(),
): UseQueryResult<TData> {
	return useDrizzleTanstackCore<TData>(options, queryClient, false, true) as UseQueryResult<TData>;
}

/**
 * Same as useDrizzleTanstackLiveIncremental, but in TanStack Query's suspense mode.
 */
export function useDrizzleTanstackLiveIncrementalSuspense<TData = unknown>(
	options: UseDrizzleTanstackOptions<TData> & { diffKey: string },
	queryClient: QueryClient = useQueryClient(),
): UseSuspenseQueryResult<TData> {
	return useDrizzleTanstackCore<TData>(options, queryClient, true, true) as UseSuspenseQueryResult<TData>;
}