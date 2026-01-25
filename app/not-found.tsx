import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiHome, FiArrowLeft } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <span className="text-6xl font-bold text-primary">404</span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
          <p className="text-muted-foreground text-lg max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard">
              <FiArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <FiHome className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
