"use client";
import { usePreferences } from "@/components/preferences-provider";
import { DEFAULT_PREFERENCES, TABLE_COLUMNS } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
const labels = { role: "Role", status: "Status", date: "Sent date", followUp: "Follow-up date", actions: "Actions" };
export function TableSettings() {
  const { preferences, update, ready, saving, error } = usePreferences();
  const value = preferences.table;
  return <Card><CardHeader><CardTitle>Outreach table preferences</CardTitle><CardDescription>Customize the dashboard outreach table. Company names remain visible and open the record. Smaller screens may collapse optional columns.</CardDescription></CardHeader><CardContent><fieldset disabled={!ready} className="min-w-0 space-y-5">
    <div className="space-y-2"><label htmlFor="table-size">Rows per page</label><Select value={String(value.pageSize)} onValueChange={size => update("table", { ...value, pageSize: Number(size) as 10 | 20 | 50 })}><SelectTrigger id="table-size"><SelectValue /></SelectTrigger><SelectContent>{[10, 20, 50].map(size => <SelectItem key={size} value={String(size)}>{size} rows</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><label htmlFor="table-method">Default contact method filter</label><Select value={value.defaultMethod} onValueChange={method => update("table", { ...value, defaultMethod: method as typeof value.defaultMethod })}><SelectTrigger id="table-method"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All methods</SelectItem><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="LINKEDIN">LinkedIn</SelectItem></SelectContent></Select></div>
    <div className="grid gap-3 sm:grid-cols-2">{TABLE_COLUMNS.map(column => <label key={column} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={value.columns.includes(column)} onChange={event => update("table", { ...value, columns: event.target.checked ? [...value.columns, column] : value.columns.filter(item => item !== column) })} />{labels[column]}</label>)}</div>
    <p role="status" className="text-xs text-muted-foreground">{error ? "Could not save. Check Account sync in Data." : saving ? "Saving..." : "Changes sync to your account."}</p><Button variant="outline" onClick={() => update("table", DEFAULT_PREFERENCES.table)}>Reset table preferences</Button>
  </fieldset></CardContent></Card>;
}
