"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportExcel } from "@/components/export-excel";
import { FiDatabase, FiDownload } from "react-icons/fi";

export function DataManagement({ outreachData }: { outreachData: any[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden group">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <FiDatabase size={20} />
          </div>
          <div>
            <CardTitle className="font-bold">Data Management</CardTitle>
            <CardDescription>Export or manage your outreach records</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">Export All Data</h4>
            <p className="text-sm text-muted-foreground max-w-[400px]">
              Download your entire outreach history as an Excel file for backup or external analysis.
            </p>
          </div>
          
          <ExportExcel data={outreachData} fileName="cold-track-full-export" />
        </div>
      </CardContent>
    </Card>
  );
}
