"use client";

import { Button } from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface ExportExcelProps {
  data: any[];
  fileName?: string;
}

export function ExportExcel({ data, fileName = "outreach-data" }: ExportExcelProps) {
  const handleExport = () => {
    try {
      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Format data for export
      const formattedData = data.map((item) => ({
        Company: item.companyName,
        Role: item.roleTargeted,
        Website: item.companyLink || "",
        "Person Name": item.personName,
        "Person Role": item.personRole,
        Status: item.status,
        "Sent Date": item.messageSentAt ? format(new Date(item.messageSentAt), "yyyy-MM-dd") : "",
        "Follow Up Due": item.followUpDueAt ? format(new Date(item.followUpDueAt), "yyyy-MM-dd") : "",
        "Contact Method": item.contactMethod,
        "Email": item.emailAddress || "",
        "Notes": item.notes || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Outreach");
      
      // Generate buffer
      XLSX.writeFile(workbook, `${fileName}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      
      toast.success("Export successful!");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export data");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <FiDownload className="h-4 w-4" />
      Export to Excel
    </Button>
  );
}
