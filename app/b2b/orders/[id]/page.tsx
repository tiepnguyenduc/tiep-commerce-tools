import { B2BOrderConfirmation } from "@/components/b2b/B2BCheckout";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ businessUnitKey?: string }>;
}) {
  const [{ id }, { businessUnitKey }] = await Promise.all([params, searchParams]);
  return <B2BOrderConfirmation id={id} businessUnitKey={businessUnitKey} />;
}
