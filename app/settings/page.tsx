import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { OutreachStats } from "@/components/settings/outreach-stats";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { DataManagement } from "@/components/settings/data-management";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { getOutreachItems } from "@/actions/outreach";
import { FiSettings } from "react-icons/fi";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar } from "@/components/sidebar";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const { user } = session;
  
  // Fetch full user data to get notification settings
  const fullUser = await db.query.users.findFirst({
    where: eq(users.id, user.id as string),
  });

  const outreachItems = await getOutreachItems();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto py-12 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-12 md:pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-primary">
                <FiSettings className="animate-spin-slow" size={20} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Configuration</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Account <span className="text-primary/90 font-bold">Settings</span>
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                Manage your profile, security, and view your performance metrics.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Overlay & Stats */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Card */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden group">
                <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent group-hover:from-primary/30 transition-all duration-500" />
                <CardHeader className="relative -mt-10">
                  <div className="relative inline-block mx-auto mb-4">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-125 group-hover:scale-150 transition-transform duration-500" />
                    <Avatar className="h-20 w-20 border-4 border-background shadow-premium relative z-10 transition-transform group-hover:scale-105">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-black italic">
                        {user.name?.[0] || user.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center space-y-1">
                    <CardTitle className="text-xl font-bold tracking-tight">{user.name || "User"}</CardTitle>
                    <CardDescription className="text-xs font-semibold text-muted-foreground tracking-widest">{user.email}</CardDescription>
                  </div>
                </CardHeader>
              </Card>

              {/* Outreach Stats Card */}
              <OutreachStats />
              
              {/* Other functional stuff could go here if needed */}
            </div>

            {/* Right Column: Forms & Danger Zone */}
            <div className="lg:col-span-2 space-y-8">
              <ChangePasswordForm />
              
              <NotificationSettings 
                initialEmail={fullUser?.notificationEmail || null} 
                initialReceiveNotifications={fullUser?.receiveNotifications ?? true} 
              />
              
              <DataManagement outreachData={outreachItems} />
              
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
