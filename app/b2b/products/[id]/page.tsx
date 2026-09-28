import { B2BProductDetail } from "@/components/b2b/B2BProductDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <B2BProductDetail id={id} />;
}
