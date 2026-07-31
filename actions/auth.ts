"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});
type AuthActionState = { error?: string } | null | undefined;

export async function signUpAction(_prevState: AuthActionState, formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  const parsed = signUpSchema.safeParse({ name, email, password });

  if (!parsed.success) {
    return { error: "Invalid data" };
  }

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return { error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  redirect("/signin");
}

export async function googleSignIn() {
    await signIn("google");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

export async function credentialsSignIn(_prevState: AuthActionState, formData: FormData) {
    try {
        await signIn("credentials", formData);
    } catch (error) {
        if (error && typeof error === "object" && "type" in error && error.type === "CredentialsSignin") {
             return { error: "Invalid credentials." };
        }
        throw error;
    }
}
