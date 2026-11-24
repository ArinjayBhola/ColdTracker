import type { QueryClient } from "@tanstack/react-query";

// Inactive entries are marked stale; only visible queries refetch immediately.
export async function invalidateOutreachLists(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ["follow-ups"] }),
    client.invalidateQueries({ queryKey: ["stats"] }),
  ]);
}
