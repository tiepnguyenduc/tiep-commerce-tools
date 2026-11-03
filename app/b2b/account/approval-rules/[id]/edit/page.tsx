import { B2BApprovalRuleEditorPage } from "@/components/b2b/B2BApprovalRules";
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
    <B2BApprovalRuleEditorPage id={id} businessUnitKey={businessUnitKey} />
  );
}
