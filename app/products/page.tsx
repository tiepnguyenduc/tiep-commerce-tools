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
      basePath="/products"
      searchParams={await searchParams}
      variant="catalog"
    />
  );
}
