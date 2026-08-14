import {
  ProductListingPage,
  type ProductSearchParams,
} from "@/components/ProductListingPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>;
}) {
  return (
    <ProductListingPage
      basePath="/search"
      searchParams={await searchParams}
      variant="search"
    />
  );
}
