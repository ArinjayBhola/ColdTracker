export function PageLoading() {
  return <main className="flex-1 space-y-6 p-6 md:p-10" aria-busy="true" aria-label="Loading page">
    <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
    <div className="h-80 animate-pulse rounded-2xl bg-muted" />
  </main>;
}
