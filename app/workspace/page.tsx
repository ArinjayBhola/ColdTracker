import { getAccountPreferences } from "@/actions/preferences";
import { redirect } from "next/navigation";
export default async function WorkspacePage() {
  const account = await getAccountPreferences();
  if (!account) redirect("/signin");
  redirect(account.preferences?.navigation.landing ?? "/dashboard");
}
