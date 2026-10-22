import { B2BApprovalRulesPage } from "@/components/b2b/B2BApprovalRules";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ businessUnitKey?: string }>;
}) {
  const { businessUnitKey } = await searchParams;
  return <B2BApprovalRulesPage businessUnitKey={businessUnitKey} />;
}
