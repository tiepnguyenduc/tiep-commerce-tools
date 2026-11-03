import { B2BApprovalFlowDetailPage } from "@/components/b2b/B2BApprovalFlows";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ businessUnitKey?: string }>;
}) {
  const [{ id }, { businessUnitKey }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <B2BApprovalFlowDetailPage id={id} businessUnitKey={businessUnitKey} />
  );
}
