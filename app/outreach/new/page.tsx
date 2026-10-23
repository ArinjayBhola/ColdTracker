import { Suspense } from "react";
import { OutreachForm } from "@/components/outreach-form";
import { Sidebar } from "@/components/sidebar";
export default function NewOutreachPage() { return <div className="flex h-screen overflow-hidden"><Sidebar /><div className="min-w-0 flex-1 overflow-y-auto"><Suspense fallback={null}><OutreachForm /></Suspense></div></div>; }
