import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parsePreferences } from "@/lib/preferences";
import { defaultShortcutPreferences, shortcutPreferencesSchema } from "@/lib/keyboard-shortcuts";

export async function GET() {
  const started = performance.now();
  const session = await auth();
  const headers = { "Cache-Control": "private, no-store" };
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { preferences: true, keyboardShortcuts: true } });
  if (!user) return Response.json({ error: "Account not found" }, { status: 404, headers });
  const shortcuts = shortcutPreferencesSchema.safeParse(user.keyboardShortcuts);
  return Response.json({ preferences: user.preferences ? parsePreferences(user.preferences) : null, shortcuts: shortcuts.success ? shortcuts.data : defaultShortcutPreferences }, { headers: { ...headers, "Server-Timing": `handler;dur=${(performance.now() - started).toFixed(1)}` } });
}
