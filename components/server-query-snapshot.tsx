import { dehydrate, HydrationBoundary, QueryClient, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Hydration merges newer server snapshots into an existing browser cache.
// Unlike initialData, it also handles router refreshes and repeat visits.
export function ServerQuerySnapshot({ queryKey, data, updatedAt, children }: {
  queryKey: QueryKey; data: unknown; updatedAt: number; children: ReactNode;
}) {
  const client = new QueryClient();
  if (data !== undefined) client.setQueryData(queryKey, data, { updatedAt });
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
