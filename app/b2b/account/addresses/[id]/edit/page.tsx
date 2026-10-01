import { B2BAddressEditor } from "@/components/b2b/B2BAccountWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <B2BAddressEditor id={id} />;
}
