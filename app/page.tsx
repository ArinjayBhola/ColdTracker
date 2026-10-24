import LandingPage from "@/components/landing-page";
import { getAccountPreferences } from "@/actions/preferences";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const account = await getAccountPreferences();
  if (account) redirect(account.preferences?.navigation.landing ?? "/dashboard");
  return <LandingPage />;
}
