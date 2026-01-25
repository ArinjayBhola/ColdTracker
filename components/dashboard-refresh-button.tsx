"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiRefreshCw } from "react-icons/fi";
import { useState } from "react";

export function DashboardRefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Reset the spinning state after a short delay
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleRefresh}
      className="h-11 w-11 rounded-xl border-2"
      title="Refresh dashboard"
    >
      <FiRefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
}
