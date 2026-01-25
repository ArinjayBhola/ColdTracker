"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { changePasswordAction } from "@/actions/settings";
import { FiLock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { PasswordInput } from "@/components/ui/password-input";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordValues) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("currentPassword", data.currentPassword);
      formData.append("newPassword", data.newPassword);
      formData.append("confirmPassword", data.confirmPassword);

      const result = await changePasswordAction(formData);

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your password has been updated.",
        });
        reset();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-premium overflow-hidden group">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <FiLock size={20} />
          </div>
          <div>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 ml-1">Current Password</label>
            <PasswordInput
               {...register("currentPassword")}
               placeholder="••••••••"
               className={errors.currentPassword ? "border-destructive" : ""}
            />
            {errors.currentPassword && (
              <p className="text-xs font-medium text-destructive ml-1">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">New Password</label>
              <PasswordInput
                {...register("newPassword")}
                placeholder="••••••••"
                className={errors.newPassword ? "border-destructive" : ""}
              />
              {errors.newPassword && (
                <p className="text-xs font-medium text-destructive ml-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">Confirm New Password</label>
              <PasswordInput
                {...register("confirmPassword")}
                placeholder="••••••••"
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-xs font-medium text-destructive ml-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
