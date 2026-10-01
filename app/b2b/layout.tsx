import { B2BProvider } from "@/components/b2b/B2BProvider";
import { B2BShell } from "@/components/b2b/B2BShell";
import { B2BCompareProvider } from "@/components/b2b/B2BCompare";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <B2BProvider>
      <B2BCompareProvider><B2BShell>{children}</B2BShell></B2BCompareProvider>
    </B2BProvider>
  );
}
