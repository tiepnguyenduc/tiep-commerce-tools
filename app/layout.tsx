import "@fortawesome/fontawesome-svg-core/styles.css";
import "@/lib/fontawesome";
import "swiper/css";
import "swiper/css/navigation";
import "./globals.css";
import "./launchpad.css";
import "react-loading-skeleton/dist/skeleton.css";
import type { Metadata } from "next";
import LaunchpadUIProvider from "@/components/LaunchpadUIProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import StorefrontChrome from "@/components/StorefrontChrome";
import { ToastProvider } from "@/components/Toast";
export const metadata: Metadata = {
  title: "WORK/SHOP · Commerce Launchpad",
  description: "A B2C and B2B commercetools training storefront",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Extensions (ColorZilla, Grammarly, ...) inject attributes on <body> before
          React hydrates; suppress the resulting one-level attribute mismatch. */}
      <body
        id="launchpad-storefront"
        data-theme="default"
        suppressHydrationWarning
      >
        <LaunchpadUIProvider resetStyles={false}>
          <ToastProvider>
            <StorefrontChrome header={<Header />} footer={<Footer />}>
              {children}
            </StorefrontChrome>
          </ToastProvider>
        </LaunchpadUIProvider>
      </body>
    </html>
  );
}
