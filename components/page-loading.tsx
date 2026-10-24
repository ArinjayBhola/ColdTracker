import { Sidebar } from "@/components/sidebar";
export function PageLoading() {
  return <div className="app-page"><Sidebar /><main className="app-main" aria-busy="true" aria-label="Loading page"><div className="app-container">
    <span role="status" className="sr-only">Loading page content</span>
    <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
    <div className="h-80 animate-pulse rounded-2xl bg-muted" />
  </div></main></div>;
}
