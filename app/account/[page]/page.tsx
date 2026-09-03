import { notFound } from "next/navigation";
import { accountPages, resolveAccountPage } from "@/lib/account-pages";
import { AccountPageContent } from "../account-page-content";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return accountPages
    .filter((page) => page.id !== "dashboard")
    .map((page) => ({ page: page.href.split("/").at(-1)! }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const accountPage = resolveAccountPage(page);
  if (!accountPage || accountPage === "dashboard") notFound();

  return await AccountPageContent({ initialPage: accountPage });
}
