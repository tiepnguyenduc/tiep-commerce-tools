"use client";
import { usePathname } from "next/navigation";
import { MiniCartProvider } from "@/components/MiniCart";

export default function StorefrontChrome({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/b2b" || pathname.startsWith("/b2b/"))
    return <>{children}</>;
  return (
    <MiniCartProvider>
      {header}
      {children}
      {footer}
    </MiniCartProvider>
  );
}
