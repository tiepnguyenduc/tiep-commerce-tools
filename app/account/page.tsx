import { AccountPageContent } from "./account-page-content";

// The session lives on the server, so this page must render per request —
// otherwise a prerendered login form is served to signed-in customers.
export const dynamic = "force-dynamic";

export default async function Page() {
  return await AccountPageContent({ initialPage: "dashboard" });
}
