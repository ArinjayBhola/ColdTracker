import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type TokenResult = {
  accessToken: string;
  provider: "gmail" | "outlook";
};

export async function getValidAccessToken(
  userId: string
): Promise<TokenResult | null> {
  // Try Google first, then Microsoft
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const googleAccount = userAccounts.find((a) => a.provider === "google");
  const microsoftAccount = userAccounts.find(
    (a) => a.provider === "microsoft-entra-id"
  );

  const account = googleAccount || microsoftAccount;
  if (!account || !account.access_token) return null;

  const provider = googleAccount ? "gmail" : "outlook";

  // Check if token is expired (with 5-minute buffer)
  const isExpired =
    account.expires_at && account.expires_at * 1000 < Date.now() - 5 * 60 * 1000;

  if (isExpired && account.refresh_token) {
    const refreshed = await refreshAccessToken(account, provider);
    if (refreshed) return refreshed;
  }

  return { accessToken: account.access_token, provider };
}

async function refreshAccessToken(
  account: typeof accounts.$inferSelect,
  provider: "gmail" | "outlook"
): Promise<TokenResult | null> {
  if (!account.refresh_token) return null;

  const tokenUrl =
    provider === "gmail"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";

  const clientId =
    provider === "gmail"
      ? process.env.AUTH_GOOGLE_ID!
      : process.env.AZURE_AD_CLIENT_ID!;

  const clientSecret =
    provider === "gmail"
      ? process.env.AUTH_GOOGLE_SECRET!
      : process.env.AZURE_AD_CLIENT_SECRET!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: account.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;

  const data = await res.json();

  // Update the token in the database
  await db
    .update(accounts)
    .set({
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000 + (data.expires_in || 3600)),
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .where(
      and(
        eq(accounts.provider, account.provider),
        eq(accounts.providerAccountId, account.providerAccountId)
      )
    );

  return { accessToken: data.access_token, provider };
}

export async function getConnectedEmailProvider(
  userId: string
): Promise<"gmail" | "outlook" | null> {
  const userAccounts = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  if (userAccounts.find((a) => a.provider === "google")) return "gmail";
  if (userAccounts.find((a) => a.provider === "microsoft-entra-id"))
    return "outlook";
  return null;
}
