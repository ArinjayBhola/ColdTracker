"use client";

import { useTransition } from "react";
import { updateNotificationSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FiBell, FiMail } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { sendTestEmailAction } from "@/actions/settings";

interface NotificationSettingsProps {
  initialEmail: string | null;
  initialReceiveNotifications: boolean;
}

export function NotificationSettings({ initialEmail, initialReceiveNotifications }: NotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateNotificationSettingsAction(formData);
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Notification settings updated successfully",
        });
      }
    });
  }

  async function handleSendTest() {
    startTransition(async () => {
      const result = await sendTestEmailAction();
      if (result.error) {
        toast({
          title: "Test Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test Success",
          description: result.success as string,
        });
      }
    });
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden group">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <FiBell size={18} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Notification Settings</CardTitle>
            <CardDescription className="text-sm font-medium">
              Manage where and when you receive reminders.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail" className="text-sm font-semibold tracking-wide">
              Notification Email
            </Label>
            <Input
              id="notificationEmail"
              name="notificationEmail"
              type="email"
              placeholder="your@email.com"
              defaultValue={initialEmail || ""}
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground font-medium italic">
              Reminders will be sent here. Default is your login email.
            </p>
          </div>

          <div className="flex items-start space-x-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <Checkbox
              id="receiveNotifications"
              name="receiveNotifications"
              defaultChecked={initialReceiveNotifications}
              value="true"
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="receiveNotifications"
                className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable Email Notifications
              </label>
              <p className="text-xs text-muted-foreground font-medium">
                Receive reminders at 5:00 PM IST if no outreach is uploaded or if follow-ups are due.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            disabled={isPending} 
            className="w-full md:w-auto font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notification Settings
          </Button>
          <Button 
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleSendTest}
            className="w-full md:w-auto font-bold border-primary/20 hover:bg-primary/5 mx-2"
          >
            <FiMail className="mr-2" />
            Send Test Email
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
