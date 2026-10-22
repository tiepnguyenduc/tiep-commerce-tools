import { B2BProvider } from "@/components/b2b/B2BProvider";
import { B2BShell } from "@/components/b2b/B2BShell";
import { B2BCompareProvider } from "@/components/b2b/B2BCompare";
import { B2BWishlistProvider } from "@/components/b2b/B2BWishlist";
import { B2BMiniCartProvider } from "@/components/b2b/B2BMiniCart";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <B2BProvider>
      <B2BMiniCartProvider>
        <B2BCompareProvider>
          <B2BWishlistProvider>
            <B2BShell>{children}</B2BShell>
          </B2BWishlistProvider>
        </B2BCompareProvider>
      </B2BMiniCartProvider>
    </B2BProvider>
  );
}
