import { notFound } from "next/navigation";
import { accountPages, isAccountPage } from "@/lib/account-pages";
import { AccountPageContent } from "../account-page-content";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return accountPages
    .filter((page) => page.id !== "dashboard")
    .map((page) => ({ page: page.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!isAccountPage(page) || page === "dashboard") notFound();

  return await AccountPageContent({ initialPage: page });
}
