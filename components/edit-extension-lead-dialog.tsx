"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateExtensionLeadAction } from "@/actions/extension-leads";
import { useState } from "react";
import { FiEdit2, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import * as z from "zod";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

const editExtensionLeadSchema = z.object({
  id: z.string(),
  personName: z.string().min(1, "Name is required"),
  companyName: z.string().min(1, "Company is required"),
  companyUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  position: z.string().min(1, "Position is required"),
  personRole: z.string().min(1, "Designation is required"),
  emailAddress: z.string().email("Invalid email").optional().or(z.literal("")),
  outreachDate: z.string().min(1, "Outreach date is required"),
  followUpDate: z.string().optional().or(z.literal("")),
});

type EditExtensionLeadValues = z.infer<typeof editExtensionLeadSchema>;

export function EditExtensionLeadDialog({ initialData }: { initialData: any }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [showCustomRole, setShowCustomRole] = useState(() => {
    const predefinedRoles = ["HR", "CEO", "CTO", "RECRUITER", "OTHER"];
    return initialData.personRole && !predefinedRoles.includes(initialData.personRole);
  });

  const form = useForm<EditExtensionLeadValues>({
    resolver: zodResolver(editExtensionLeadSchema),
    defaultValues: {
      id: initialData.id,
      personName: initialData.personName,
      companyName: initialData.companyName || "",
      companyUrl: initialData.companyUrl || "",
      position: initialData.position || "",
      personRole: initialData.personRole || "RECRUITER",
      emailAddress: initialData.emailAddress || "",
      outreachDate: initialData.outreachDate 
        ? new Date(initialData.outreachDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      followUpDate: initialData.followUpDate 
        ? new Date(initialData.followUpDate).toISOString().split('T')[0] 
        : "",
    },
  });

  async function onSubmit(values: EditExtensionLeadValues) {
    setIsPending(true);
    const res = await updateExtensionLeadAction(values.id, {
        personName: values.personName,
        companyName: values.companyName,
        companyUrl: values.companyUrl,
        position: values.position,
        personRole: values.personRole,
        emailAddress: values.emailAddress === "" ? null : values.emailAddress,
        outreachDate: new Date(values.outreachDate),
        followUpDate: values.followUpDate ? new Date(values.followUpDate) : null,
    });
    setIsPending(false);

    if (res.success) {
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update lead",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full hover:bg-muted"
        >
          <FiEdit2 className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
          <span className="sr-only">Edit Lead</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Lead</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="personName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Google" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Targeted Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Frontend Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Contact Designation</FormLabel>
                      <div className="space-y-2">
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setShowCustomRole(value === "OTHER");
                          }} 
                          defaultValue={showCustomRole ? "OTHER" : field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="CTO">CTO</SelectItem>
                            <SelectItem value="RECRUITER">Recruiter</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {showCustomRole && (
                          <FormControl>
                            <Input 
                              placeholder="Specify role..." 
                              value={field.value === "OTHER" ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              required
                              className="animate-in fade-in slide-in-from-top-1"
                            />
                          </FormControl>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <FormField
                control={form.control}
                name="outreachDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-1">
                    <FormLabel className="font-bold">Outreach Date</FormLabel>
                    <DatePicker 
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-1">
                    <FormLabel className="font-bold">Follow-up Date</FormLabel>
                    <DatePicker 
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-bold min-w-[100px]">
                {isPending ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
