import { B2BApprovalFlowsPage } from "@/components/b2b/B2BApprovalFlows";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ businessUnitKey?: string; status?: string }>;
}) {
  const { businessUnitKey, status } = await searchParams;
  return (
    <B2BApprovalFlowsPage businessUnitKey={businessUnitKey} status={status} />
  );
}
