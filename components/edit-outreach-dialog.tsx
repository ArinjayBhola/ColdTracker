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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditOutreachValues, editOutreachSchema } from "@/lib/validations";
import { updateOutreachAction } from "@/actions/outreach";
import { useState } from "react";
import { FiEdit2, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export interface EditOutreachDialogProps {
  initialData: EditOutreachValues;
};

export function EditOutreachDialog({ initialData }: EditOutreachDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<EditOutreachValues>({
    resolver: zodResolver(editOutreachSchema) as any,
    defaultValues: {
      id: initialData.id,
      companyName: initialData.companyName,
      companyLink: initialData.companyLink ?? undefined,
      roleTargeted: initialData.roleTargeted,
      personName: initialData.personName,
      personRole: initialData.personRole,
      contactMethod: initialData.contactMethod,
      emailAddress: initialData.emailAddress ?? undefined,
      linkedinProfileUrl: initialData.linkedinProfileUrl ?? undefined,
    },
  });

  async function onSubmit(values: EditOutreachValues) {
    setIsPending(true);
    const res = await updateOutreachAction(values);
    setIsPending(false);

    if (res.success) {
      toast({
        title: "Success",
        description: "Outreach updated successfully",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to update outreach",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-bold h-9">
          <FiEdit2 className="w-4 h-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Outreach</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                name="companyLink"
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

            <FormField
              control={form.control}
              name="roleTargeted"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="personRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Designation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="linkedinProfileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">LinkedIn Profile</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
